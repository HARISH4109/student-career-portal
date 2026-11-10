import { db, schema } from '@career-portal/db';
import type { AuthenticatedUser, RoleName } from '@career-portal/shared-types';
import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';

import { verifyIdentity } from './require-identity.middleware';

import { UnauthorizedError } from '@/shared/errors/app-error';

/**
 * Resolves authorization from the database on every request. Role revocation
 * and account deactivation must take effect even when Redis is unavailable.
 */
async function resolveUserContext(userId: string): Promise<{
  roles: RoleName[];
  permissions: string[];
} | null> {
  // Query DB: users → user_roles → roles → role_permissions → permissions
  const userWithRoles = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    with: {
      userRoles: {
        with: {
          role: {
            with: {
              rolePermissions: {
                with: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!userWithRoles || !userWithRoles.isActive) {
    return null;
  }

  const roles = userWithRoles.userRoles.map((ur) => ur.role.name as RoleName);
  const permissionSet = new Set<string>();
  for (const ur of userWithRoles.userRoles) {
    for (const rp of ur.role.rolePermissions) {
      permissionSet.add(rp.permission.key);
    }
  }
  const permissions = Array.from(permissionSet);

  return { roles, permissions };
}

/**
 * Express middleware that verifies the Supabase JWT from the Authorization
 * header and attaches `req.user` with roles and permissions.
 *
 * Pipeline: Extract Bearer token → Supabase verifies signature/expiry →
 * look up user + RBAC from DB (with Redis cache) → attach to request.
 *
 * Any route mounted after this middleware can safely access `req.user`.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const identity = await verifyIdentity(req);

    // Resolve roles + permissions from our DB
    const context = await resolveUserContext(identity.id);
    if (!context) {
      throw new UnauthorizedError('User account not found or deactivated');
    }

    // Attach typed user context to the request
    const authenticatedUser: AuthenticatedUser = {
      id: identity.id,
      email: identity.email,
      fullName: identity.fullName,
      roles: context.roles,
      permissions: context.permissions,
    };

    req.user = authenticatedUser;
    next();
  } catch (error) {
    next(error);
  }
}
