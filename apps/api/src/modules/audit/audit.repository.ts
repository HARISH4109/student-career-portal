import { db, schema } from '@career-portal/db';
import { and, count, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';

import { escapeLikePattern } from '@/shared/db/escape-like';

import type { AuditFilterOptions, AuditLogItem, AuditLogsQuery, CreateAuditLogParams } from './audit.dto';

export class AuditRepository {
  async create(params: CreateAuditLogParams): Promise<void> {
    await db.insert(schema.auditLogs).values({
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      requestId: params.requestId ?? null,
      origin: params.origin ?? null,
      metadata: params.metadata ?? {},
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  }

  async findMany(query: AuditLogsQuery): Promise<{ logs: AuditLogItem[]; total: number }> {
    const { page, pageSize, action, entityType, userId, requestId, origin, dateFrom, dateTo, search } = query;
    const offset = (page - 1) * pageSize;

    const conditions = [];

    if (action) {
      conditions.push(eq(schema.auditLogs.action, action));
    }
    if (entityType) {
      conditions.push(eq(schema.auditLogs.entityType, entityType));
    }
    if (userId) {
      conditions.push(eq(schema.auditLogs.userId, userId));
    }
    if (requestId) {
      conditions.push(eq(schema.auditLogs.requestId, requestId));
    }
    if (origin) {
      conditions.push(ilike(schema.auditLogs.origin, `%${escapeLikePattern(origin)}%`));
    }
    if (dateFrom) {
      conditions.push(gte(schema.auditLogs.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const toDate = dateTo.length === 10 ? new Date(`${dateTo}T23:59:59.999Z`) : new Date(dateTo);
      conditions.push(lte(schema.auditLogs.createdAt, toDate));
    }
    if (search) {
      const escapedSearch = escapeLikePattern(search);
      conditions.push(
        or(
          ilike(schema.auditLogs.action, `%${escapedSearch}%`),
          ilike(schema.auditLogs.entityType, `%${escapedSearch}%`),
          ilike(schema.auditLogs.userAgent, `%${escapedSearch}%`),
          ilike(schema.auditLogs.requestId, `%${escapedSearch}%`),
          ilike(schema.auditLogs.origin, `%${escapedSearch}%`),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countRes = await db
      .select({ total: count() })
      .from(schema.auditLogs)
      .where(whereClause);
    const total = Number(countRes[0]?.total ?? 0);

    const rows = await db.query.auditLogs.findMany({
      where: whereClause,
      with: {
        user: true,
      },
      limit: pageSize,
      offset,
      orderBy: [desc(schema.auditLogs.createdAt)],
    });

    const logs: AuditLogItem[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userEmail: r.user?.email ?? null,
      userFullName: r.user?.fullName ?? null,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      requestId: r.requestId,
      origin: r.origin ?? null,
      metadata:
        typeof r.metadata === 'object' && r.metadata !== null
          ? (r.metadata as Record<string, unknown>)
          : {},
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    }));

    return { logs, total };
  }

  async getFilterOptions(): Promise<AuditFilterOptions> {
    const DEFAULT_ACTIONS = [
      'auth.login',
      'auth.logout',
      'auth.registered',
      'auth.password_reset_requested',
      'user.activated',
      'user.deactivated',
      'user.role_assigned',
      'user.role_revoked',
      'opportunity.created',
      'opportunity.updated',
      'opportunity.published',
      'opportunity.rejected',
      'opportunity.status_changed',
      'opportunity_draft.ingested',
      'opportunity_draft.approved',
      'opportunity_draft.rejected',
      'opportunity_draft.retried',
      'application.submitted',
      'application.status_changed',
      'application.withdrawn',
      'academic.course_created',
      'academic.course_updated',
      'academic.course_deactivated',
      'academic.stream_created',
      'academic.stream_updated',
      'academic.stream_deactivated',
      'academic.batch_created',
      'academic.batch_updated',
      'academic.batch_deactivated',
      'notice.created',
      'notice.published',
      'notice.pinned',
      'notice.unpinned',
      'notice.expired',
      'resume.created',
      'resume.uploaded',
      'resume.deleted',
      'resume.ai_analyzed',
      'test.created',
      'test.attempt_submitted',
      'interview.ai_evaluated',
    ];

    const DEFAULT_ENTITY_TYPES = [
      'user',
      'opportunity',
      'opportunity_draft',
      'job_application',
      'course',
      'stream',
      'batch',
      'department',
      'notice',
      'resume',
      'mock_test',
      'mock_test_attempt',
      'mock_interview',
    ];

    const [actionRows, entityRows] = await Promise.all([
      db
        .selectDistinct({ action: schema.auditLogs.action })
        .from(schema.auditLogs)
        .orderBy(schema.auditLogs.action),
      db
        .selectDistinct({ entityType: schema.auditLogs.entityType })
        .from(schema.auditLogs)
        .orderBy(schema.auditLogs.entityType),
    ]);

    const actions = Array.from(
      new Set([...actionRows.map((r) => r.action).filter(Boolean), ...DEFAULT_ACTIONS]),
    ).sort();

    const entityTypes = Array.from(
      new Set([...entityRows.map((r) => r.entityType).filter(Boolean), ...DEFAULT_ENTITY_TYPES]),
    ).sort();

    return {
      actions,
      entityTypes,
    };
  }
}
