import { db, schema } from '@career-portal/db';
import type {
  CreateNoticeInput,
  NoticeCategory,
  NoticeQueryInput,
  NoticeStatus,
  UpdateNoticeInput,
} from '@career-portal/shared-types';
import { and, count, desc, eq, gt, ilike, isNull, lte, or } from 'drizzle-orm';

import { escapeLikePattern } from '@/shared/db/escape-like';

export interface StudentTargetingCriteria {
  role?: string;
  departmentId?: string | null;
  batchId?: string | null;
}

export class NoticesRepository {
  constructor(private readonly database = db) { }

  async findTargetedNotices(
    _criteria?: Partial<StudentTargetingCriteria>,
    query: NoticeQueryInput = { page: 1, pageSize: 20 },
  ) {
    const now = new Date();

    // Universal notice delivery: all published notices are visible to all students
    // without department, batch, or audience restrictions.
    const conditions = [
      eq(schema.notices.status, 'published'),
      lte(schema.notices.publishedAt, now),
      or(isNull(schema.notices.expiresAt), gt(schema.notices.expiresAt, now)),
    ];

    if (query.category) {
      conditions.push(eq(schema.notices.category, query.category));
    }
    if (query.isPinned !== undefined) {
      conditions.push(eq(schema.notices.isPinned, query.isPinned));
    }
    if (query.search) {
      const escapedSearch = escapeLikePattern(query.search);
      conditions.push(
        or(
          ilike(schema.notices.title, `%${escapedSearch}%`),
          ilike(schema.notices.content, `%${escapedSearch}%`),
        )!,
      );
    }

    const where = and(...conditions);
    const offset = (query.page - 1) * query.pageSize;

    const data = await this.database
      .select({
        notice: schema.notices,
        postedByName: schema.users.fullName,
        targetDepartmentName: schema.departments.name,
        targetBatchYear: schema.batches.graduationYear,
      })
      .from(schema.notices)
      .leftJoin(schema.users, eq(schema.notices.postedBy, schema.users.id))
      .leftJoin(
        schema.departments,
        eq(schema.notices.targetDepartmentId, schema.departments.id),
      )
      .leftJoin(schema.batches, eq(schema.notices.targetBatchId, schema.batches.id))
      .where(where)
      .orderBy(desc(schema.notices.isPinned), desc(schema.notices.publishedAt))
      .limit(query.pageSize)
      .offset(offset);

    const [totalResult] = await this.database
      .select({ count: count() })
      .from(schema.notices)
      .where(where);

    return {
      data: data.map((row) => ({
        ...row.notice,
        linkUrl: row.notice.actionUrl ?? undefined,
        postedByName: row.postedByName ?? undefined,
        targetDepartmentName: row.targetDepartmentName ?? undefined,
        targetBatchYear: row.targetBatchYear ?? undefined,
      })),
      total: totalResult?.count ?? 0,
    };
  }

  async findAllNotices(query: NoticeQueryInput) {
    const conditions = [];

    if (query.category) {
      conditions.push(eq(schema.notices.category, query.category));
    }
    if (query.status) {
      conditions.push(eq(schema.notices.status, query.status));
    }
    if (query.isPinned !== undefined) {
      conditions.push(eq(schema.notices.isPinned, query.isPinned));
    }
    if (query.search) {
      const escapedSearch = escapeLikePattern(query.search);
      conditions.push(
        or(
          ilike(schema.notices.title, `%${escapedSearch}%`),
          ilike(schema.notices.content, `%${escapedSearch}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.pageSize;

    const data = await this.database
      .select({
        notice: schema.notices,
        postedByName: schema.users.fullName,
        targetDepartmentName: schema.departments.name,
        targetBatchYear: schema.batches.graduationYear,
      })
      .from(schema.notices)
      .leftJoin(schema.users, eq(schema.notices.postedBy, schema.users.id))
      .leftJoin(
        schema.departments,
        eq(schema.notices.targetDepartmentId, schema.departments.id),
      )
      .leftJoin(schema.batches, eq(schema.notices.targetBatchId, schema.batches.id))
      .where(where)
      .orderBy(desc(schema.notices.isPinned), desc(schema.notices.createdAt))
      .limit(query.pageSize)
      .offset(offset);

    const [totalResult] = await this.database
      .select({ count: count() })
      .from(schema.notices)
      .where(where);

    return {
      data: data.map((row) => ({
        ...row.notice,
        linkUrl: row.notice.actionUrl ?? undefined,
        postedByName: row.postedByName ?? undefined,
        targetDepartmentName: row.targetDepartmentName ?? undefined,
        targetBatchYear: row.targetBatchYear ?? undefined,
      })),
      total: totalResult?.count ?? 0,
    };
  }

  async findById(id: string) {
    const [row] = await this.database
      .select({
        notice: schema.notices,
        postedByName: schema.users.fullName,
        targetDepartmentName: schema.departments.name,
        targetBatchYear: schema.batches.graduationYear,
      })
      .from(schema.notices)
      .leftJoin(schema.users, eq(schema.notices.postedBy, schema.users.id))
      .leftJoin(
        schema.departments,
        eq(schema.notices.targetDepartmentId, schema.departments.id),
      )
      .leftJoin(schema.batches, eq(schema.notices.targetBatchId, schema.batches.id))
      .where(eq(schema.notices.id, id))
      .limit(1);

    if (!row) return null;

    return {
      ...row.notice,
      linkUrl: row.notice.actionUrl ?? undefined,
      postedByName: row.postedByName ?? undefined,
      targetDepartmentName: row.targetDepartmentName ?? undefined,
      targetBatchYear: row.targetBatchYear ?? undefined,
    };
  }

  async create(data: CreateNoticeInput & { postedBy: string }) {
    const publishedAt = data.publishedAt ? new Date(data.publishedAt) : new Date();
    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    const actionUrl = data.actionUrl ?? data.linkUrl ?? null;

    const [created] = await this.database
      .insert(schema.notices)
      .values({
        title: data.title,
        content: data.content,
        category: data.category as NoticeCategory,
        status: data.status as NoticeStatus,
        postedBy: data.postedBy,
        targetAudience: data.targetAudience ?? {},
        targetDepartmentId: data.targetDepartmentId ?? null,
        targetBatchId: data.targetBatchId ?? null,
        attachments: data.attachments ?? [],
        posterUrl: data.posterUrl ?? null,
        actionUrl,
        isPinned: data.isPinned ?? false,
        publishedAt,
        expiresAt,
      })
      .returning();

    return created;
  }

  async update(id: string, data: UpdateNoticeInput) {
    const updateValues: Record<string, unknown> = {};

    if (data.title !== undefined) updateValues.title = data.title;
    if (data.content !== undefined) updateValues.content = data.content;
    if (data.category !== undefined) updateValues.category = data.category;
    if (data.status !== undefined) updateValues.status = data.status;
    if (data.targetAudience !== undefined) updateValues.targetAudience = data.targetAudience;
    if (data.targetDepartmentId !== undefined) updateValues.targetDepartmentId = data.targetDepartmentId;
    if (data.targetBatchId !== undefined) updateValues.targetBatchId = data.targetBatchId;
    if (data.attachments !== undefined) updateValues.attachments = data.attachments;
    if (data.posterUrl !== undefined) updateValues.posterUrl = data.posterUrl;
    if (data.actionUrl !== undefined) updateValues.actionUrl = data.actionUrl;
    if (data.linkUrl !== undefined && data.actionUrl === undefined) updateValues.actionUrl = data.linkUrl;
    if (data.isPinned !== undefined) updateValues.isPinned = data.isPinned;
    if (data.publishedAt !== undefined)
      updateValues.publishedAt = data.publishedAt ? new Date(data.publishedAt) : new Date();
    if (data.expiresAt !== undefined)
      updateValues.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

    const [updated] = await this.database
      .update(schema.notices)
      .set(updateValues)
      .where(eq(schema.notices.id, id))
      .returning();

    return updated ?? null;
  }

  async setPin(id: string, isPinned: boolean) {
    const [updated] = await this.database
      .update(schema.notices)
      .set({ isPinned })
      .where(eq(schema.notices.id, id))
      .returning();

    return updated ?? null;
  }

  async expire(id: string) {
    const [updated] = await this.database
      .update(schema.notices)
      .set({ status: 'expired', expiresAt: new Date() })
      .where(eq(schema.notices.id, id))
      .returning();

    return updated ?? null;
  }

  async publish(id: string, publishedAt = new Date()) {
    const [updated] = await this.database
      .update(schema.notices)
      .set({ status: 'published', publishedAt })
      .where(eq(schema.notices.id, id))
      .returning();

    return updated ?? null;
  }

  async findScheduledNoticesDue(now = new Date()) {
    return this.database
      .select()
      .from(schema.notices)
      .where(
        and(
          eq(schema.notices.status, 'scheduled'),
          lte(schema.notices.publishedAt, now),
        ),
      );
  }
}

