import { db, schema } from '@career-portal/db';
import { and, count, eq } from 'drizzle-orm';

import { ConflictError } from '@/shared/errors/app-error';

export type ApplicationStatus = typeof schema.opportunityApplications.$inferSelect.status;

const applicationRelations = {
  opportunity: { with: { company: true, opportunitySkills: { with: { skill: true } } } },
  student: { with: { user: true } },
  resume: true,
  statusHistory: { with: { changedByUser: true } },
} as const;

export class ApplicationRepository {
  async findById(id: string) {
    return db.query.opportunityApplications.findFirst({
      where: eq(schema.opportunityApplications.id, id),
      with: applicationRelations,
    });
  }

  async findByStudentAndOpportunity(studentId: string, opportunityId: string) {
    return db.query.opportunityApplications.findFirst({
      where: and(
        eq(schema.opportunityApplications.studentId, studentId),
        eq(schema.opportunityApplications.opportunityId, opportunityId),
      ),
    });
  }

  async create(data: {
    opportunityId: string;
    studentId: string;
    resumeId?: string | null;
    coverNote: string | null;
    changedBy: string;
  }) {
    return db.transaction(async (tx) => {
      const [application] = await tx.insert(schema.opportunityApplications).values({
        opportunityId: data.opportunityId,
        studentId: data.studentId,
        resumeId: data.resumeId,
        coverNote: data.coverNote,
        status: 'applied',
      }).onConflictDoNothing().returning();
      if (!application) throw new ConflictError('You have already applied to this opportunity');
      await tx.insert(schema.applicationStatusHistory).values({
        applicationId: application.id,
        status: 'applied',
        changedBy: data.changedBy,
        remarks: 'Application submitted',
      });
      return application;
    });
  }

  async updateStatus(id: string, previousStatus: ApplicationStatus, status: ApplicationStatus,
    changedBy: string, remarks: string | null): Promise<void> {
    await db.transaction(async (tx) => {
      const updated = await tx.update(schema.opportunityApplications)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(schema.opportunityApplications.id, id), eq(schema.opportunityApplications.status, previousStatus)))
        .returning({ id: schema.opportunityApplications.id });
      if (updated.length === 0) throw new ConflictError('Application changed. Refresh and try again.');
      await tx.insert(schema.applicationStatusHistory).values({ applicationId: id, status, changedBy, remarks });
    });
  }

  async listByStudent(
    studentId: string,
    pagination: { page: number; pageSize: number },
    filters?: { status?: ApplicationStatus; opportunityId?: string },
  ) {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    const conditions = [eq(schema.opportunityApplications.studentId, studentId)];

    if (filters?.status) {
      conditions.push(eq(schema.opportunityApplications.status, filters.status));
    }
    if (filters?.opportunityId) {
      conditions.push(eq(schema.opportunityApplications.opportunityId, filters.opportunityId));
    }

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ total: count() })
      .from(schema.opportunityApplications)
      .where(whereClause);
    const total = (countResult[0]?.total ?? 0);

    const applications = await db.query.opportunityApplications.findMany({
      where: whereClause,
      with: applicationRelations,
      limit: pageSize,
      offset,
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    return {
      applications,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async listByOpportunity(
    opportunityId: string,
    pagination: { page: number; pageSize: number },
    statusFilter?: ApplicationStatus,
  ) {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    const conditions = [eq(schema.opportunityApplications.opportunityId, opportunityId)];

    if (statusFilter) {
      conditions.push(eq(schema.opportunityApplications.status, statusFilter));
    }

    const whereClause = and(...conditions);

    const countResult = await db
      .select({ total: count() })
      .from(schema.opportunityApplications)
      .where(whereClause);
    const total = (countResult[0]?.total ?? 0);

    const applications = await db.query.opportunityApplications.findMany({
      where: whereClause,
      with: applicationRelations,
      limit: pageSize,
      offset,
      orderBy: (a, { desc }) => [desc(a.createdAt)],
    });

    return {
      applications,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
