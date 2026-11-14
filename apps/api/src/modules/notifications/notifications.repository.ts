import { db, schema } from '@career-portal/db';
import type {
  NotificationQueryInput,
  NotificationType,
  UpdateNotificationPreferencesInput,
} from '@career-portal/shared-types';
import { and, count, desc, eq, inArray } from 'drizzle-orm';

export interface CreateNotificationRecord {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null | undefined;
}

export class NotificationsRepository {
  constructor(private readonly database = db) {}

  async findNotificationsByUser(userId: string, query: NotificationQueryInput) {
    const conditions = [eq(schema.notifications.userId, userId)];

    if (query.isRead !== undefined) {
      conditions.push(eq(schema.notifications.isRead, query.isRead));
    }
    if (query.type) {
      conditions.push(eq(schema.notifications.type, query.type));
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;

    const data = await this.database
      .select()
      .from(schema.notifications)
      .where(where)
      .orderBy(desc(schema.notifications.createdAt))
      .limit(query.pageSize)
      .offset(offset);

    const [totalResult] = await this.database
      .select({ count: count() })
      .from(schema.notifications)
      .where(where);

    return {
      data,
      total: totalResult?.count ?? 0,
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await this.database
      .select({ count: count() })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
        ),
      );

    return result?.count ?? 0;
  }

  async markAsRead(notificationId: string, userId: string) {
    const [updated] = await this.database
      .update(schema.notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.userId, userId),
        ),
      )
      .returning();

    return updated ?? null;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const updated = await this.database
      .update(schema.notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
        ),
      )
      .returning({ id: schema.notifications.id });

    return updated.length;
  }

  async create(record: CreateNotificationRecord) {
    const [created] = await this.database
      .insert(schema.notifications)
      .values({
        userId: record.userId,
        type: record.type,
        title: record.title,
        message: record.message,
        actionUrl: record.actionUrl ?? null,
      })
      .returning();

    return created;
  }

  async createBulk(records: CreateNotificationRecord[]) {
    if (records.length === 0) return [];
    return this.database
      .insert(schema.notifications)
      .values(
        records.map((r) => ({
          userId: r.userId,
          type: r.type,
          title: r.title,
          message: r.message,
          actionUrl: r.actionUrl ?? null,
        })),
      )
      .returning();
  }

  async getPreferences(userId: string) {
    const existing = await this.database.query.notificationPreferences.findFirst({
      where: eq(schema.notificationPreferences.userId, userId),
    });

    if (existing) return existing;

    const [created] = await this.database
      .insert(schema.notificationPreferences)
      .values({
        userId,
        emailEnabled: true,
        pushEnabled: true,
        mutedTypes: [],
      })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    return this.database.query.notificationPreferences.findFirst({
      where: eq(schema.notificationPreferences.userId, userId),
    });
  }

  async updatePreferences(userId: string, data: UpdateNotificationPreferencesInput) {
    await this.getPreferences(userId);

    const updateValues: Record<string, unknown> = {};
    if (data.emailEnabled !== undefined) updateValues.emailEnabled = data.emailEnabled;
    if (data.pushEnabled !== undefined) updateValues.pushEnabled = data.pushEnabled;
    if (data.mutedTypes !== undefined) updateValues.mutedTypes = data.mutedTypes;

    const [updated] = await this.database
      .update(schema.notificationPreferences)
      .set(updateValues)
      .where(eq(schema.notificationPreferences.userId, userId))
      .returning();

    return updated;
  }

  async findTargetedUserIds(
    targetAudience: Record<string, unknown> | null,
    targetDepartmentId?: string | null,
    targetBatchId?: string | null,
  ): Promise<string[]> {
    const roles = Array.isArray(targetAudience?.roles)
      ? (targetAudience.roles as string[])
      : [];

    let query = this.database
      .selectDistinct({ userId: schema.users.id })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.users.id, schema.userRoles.userId))
      .leftJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .leftJoin(schema.studentProfiles, eq(schema.users.id, schema.studentProfiles.userId))
      .$dynamic();

    const conditions = [];

    if (roles.length > 0) {
      conditions.push(inArray(schema.roles.name, roles as ('STUDENT' | 'PLACEMENT_FACULTY' | 'ADMIN')[]));
    }

    if (targetDepartmentId) {
      conditions.push(eq(schema.studentProfiles.departmentId, targetDepartmentId));
    }

    if (targetBatchId) {
      conditions.push(eq(schema.studentProfiles.batchId, targetBatchId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query;
    return rows.map((r) => r.userId);
  }
}
