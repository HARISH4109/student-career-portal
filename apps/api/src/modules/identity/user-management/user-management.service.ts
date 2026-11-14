import { db, schema } from '@career-portal/db';
import type {
  AssignRoleDto,
  AuthenticatedUser,
  PaginationMeta,
  PaginationQuery,
  RoleName,
} from '@career-portal/shared-types';
import { and, count, eq, ilike, sql } from 'drizzle-orm';

import { logger } from '@/infrastructure/logger';
import { CacheKeys, redis } from '@/infrastructure/redis';
import { auditService } from '@/modules/audit/audit.service';
import { ConflictError, ForbiddenError, NotFoundError } from '@/shared/errors/app-error';

export interface AuditContext {
  requestId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  roles: RoleName[];
  createdAt: Date;
}

interface UserListResult {
  users: UserListItem[];
  meta: PaginationMeta;
}

/**
 * User management service — admin operations for listing, activating/deactivating
 * users and assigning/revoking roles. All methods require admin permissions
 * (enforced at the route level via middleware).
 */
export class UserManagementService {
  // ── List Users ──────────────────────────────────────────────────────────
  async listUsers(
    pagination: PaginationQuery,
    filters?: { search?: string; role?: string; isActive?: boolean },
  ): Promise<UserListResult> {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions = [];
    if (filters?.isActive !== undefined) {
      conditions.push(eq(schema.users.isActive, filters.isActive));
    }
    if (filters?.search) {
      conditions.push(
        sql`(${ilike(schema.users.fullName, `%${filters.search}%`)} OR ${ilike(schema.users.email, `%${filters.search}%`)})`,
      );
    }
    if (filters?.role) {
      conditions.push(sql`EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ${schema.users.id} AND r.name = ${filters.role})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const countResult = await db
      .select({ total: count() })
      .from(schema.users)
      .where(whereClause);
    const total = countResult[0]?.total ?? 0;

    // Fetch page
    const usersRaw = await db.query.users.findMany({
      where: whereClause,
      with: {
        userRoles: {
          with: { role: true },
        },
      },
      limit: pageSize,
      offset,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    // Filter by role if specified (post-query since it's a join)
    const users: UserListItem[] = usersRaw.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      isActive: u.isActive,
      roles: u.userRoles.map((ur) => ur.role.name as RoleName),
      createdAt: u.createdAt,
    }));


    return {
      users,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ── Get User By ID ──────────────────────────────────────────────────────
  async getUserById(userId: string): Promise<AuthenticatedUser & { phone: string | null; isActive: boolean }> {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        userRoles: {
          with: {
            role: {
              with: {
                rolePermissions: {
                  with: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const roles = user.userRoles.map((ur) => ur.role.name as RoleName);
    const permissionSet = new Set<string>();
    for (const ur of user.userRoles) {
      for (const rp of ur.role.rolePermissions) {
        permissionSet.add(rp.permission.key);
      }
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      isActive: user.isActive,
      roles,
      permissions: Array.from(permissionSet),
    };
  }

  // ── Assign Role ─────────────────────────────────────────────────────────
  async assignRole(dto: AssignRoleDto, actorId?: string, ctx?: AuditContext): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, dto.userId),
    });
    if (!user) throw new NotFoundError('User');

    const role = await db.query.roles.findFirst({
      where: eq(schema.roles.name, dto.role),
    });
    if (!role) throw new NotFoundError('Role');

    const existing = await db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, dto.userId),
        eq(schema.userRoles.roleId, role.id),
      ),
    });
    if (existing) {
      throw new ConflictError(`User already has role '${dto.role}'`);
    }

    await db.insert(schema.userRoles).values({
      userId: dto.userId,
      roleId: role.id,
    });

    await this.invalidateUserCache(dto.userId);
    logger.info({ userId: dto.userId, role: dto.role }, 'Role assigned');

    await auditService.log({
      userId: actorId ?? null,
      action: 'user.role_assigned',
      entityType: 'user',
      entityId: dto.userId,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { role: dto.role, targetUserEmail: user.email },
    });
  }

  // ── Revoke Role ─────────────────────────────────────────────────────────
  async revokeRole(userId: string, roleName: RoleName, actorId?: string, ctx?: AuditContext): Promise<void> {
    if (actorId && actorId === userId && roleName === 'ADMIN') {
      throw new ForbiddenError('Cannot revoke your own ADMIN role');
    }

    const role = await db.query.roles.findFirst({
      where: eq(schema.roles.name, roleName),
    });
    if (!role) throw new NotFoundError('Role');

    if (roleName === 'ADMIN') {
      const activeAdmins = await this.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ForbiddenError('Cannot revoke the last active ADMIN role in the system');
      }
    }

    const deleted = await db
      .delete(schema.userRoles)
      .where(
        and(
          eq(schema.userRoles.userId, userId),
          eq(schema.userRoles.roleId, role.id),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      throw new NotFoundError('Role assignment');
    }

    await this.invalidateUserCache(userId);
    logger.info({ userId, role: roleName }, 'Role revoked');

    await auditService.log({
      userId: actorId ?? null,
      action: 'user.role_revoked',
      entityType: 'user',
      entityId: userId,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { role: roleName },
    });
  }

  // ── Activate / Deactivate ───────────────────────────────────────────────
  async activateUser(userId: string, actorId?: string, ctx?: AuditContext): Promise<void> {
    await this.setUserActiveStatus(userId, true);

    await auditService.log({
      userId: actorId ?? null,
      action: 'user.activated',
      entityType: 'user',
      entityId: userId,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { isActive: true },
    });
  }

  async deactivateUser(userId: string, actorId?: string, ctx?: AuditContext): Promise<void> {
    if (actorId && actorId === userId) {
      throw new ForbiddenError('Cannot deactivate your own account');
    }

    const targetIsAdmin = await this.isUserAdmin(userId);
    if (targetIsAdmin) {
      const activeAdmins = await this.countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new ForbiddenError('Cannot deactivate the last active administrator');
      }
    }

    await this.setUserActiveStatus(userId, false);

    await auditService.log({
      userId: actorId ?? null,
      action: 'user.deactivated',
      entityType: 'user',
      entityId: userId,
      requestId: ctx?.requestId,
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
      metadata: { isActive: false },
    });
  }

  // ── Private Helpers ────────────────────────────────────────────────────

  private async isUserAdmin(userId: string): Promise<boolean> {
    const adminRole = await db.query.roles.findFirst({
      where: eq(schema.roles.name, 'ADMIN'),
    });
    if (!adminRole) return false;

    const row = await db.query.userRoles.findFirst({
      where: and(
        eq(schema.userRoles.userId, userId),
        eq(schema.userRoles.roleId, adminRole.id),
      ),
    });
    return !!row;
  }

  private async countActiveAdmins(): Promise<number> {
    const adminRole = await db.query.roles.findFirst({
      where: eq(schema.roles.name, 'ADMIN'),
    });
    if (!adminRole) return 0;

    const result = await db
      .select({ total: count() })
      .from(schema.userRoles)
      .innerJoin(schema.users, eq(schema.userRoles.userId, schema.users.id))
      .where(
        and(
          eq(schema.userRoles.roleId, adminRole.id),
          eq(schema.users.isActive, true),
        ),
      );

    return Number(result[0]?.total ?? 0);
  }

  private async setUserActiveStatus(userId: string, isActive: boolean): Promise<void> {
    const result = await db
      .update(schema.users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(schema.users.id, userId))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('User');
    }

    await this.invalidateUserCache(userId);
    logger.info({ userId, isActive }, `User ${isActive ? 'activated' : 'deactivated'}`);
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await redis.del(CacheKeys.userPermissions(userId)).catch((err: unknown) => {
      logger.warn({ err, userId }, 'Failed to invalidate user permission cache');
    });
  }
}
