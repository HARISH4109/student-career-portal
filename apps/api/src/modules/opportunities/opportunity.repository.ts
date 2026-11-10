import { db, schema } from '@career-portal/db';
import { and, asc, count, desc, eq, exists, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class OpportunityRepository {
  constructor(private readonly database: typeof db | DatabaseTransaction = db) {}

  async transaction<T>(operation: (repository: OpportunityRepository) => Promise<T>): Promise<T> {
    return this.database.transaction((tx) => operation(new OpportunityRepository(tx)));
  }

  async findById(id: string) {
    return this.database.query.opportunities.findFirst({
      where: eq(schema.opportunities.id, id),
      with: {
        company: true,
        opportunitySkills: {
          with: { skill: true },
        },
        eligibility: {
          with: {
            department: true,
            program: true,
            batch: true,
          },
        },
      },
    });
  }

  async create(data: {
    companyId: string;
    title: string;
    type: 'job' | 'internship';
    description: string;
    workMode: 'remote' | 'onsite' | 'hybrid';
    location?: string | null;
    salaryMin?: string | null;
    salaryMax?: string | null;
    applicationDeadline?: Date | null;
    applyUrl?: string | null;
    applicationEmail?: string | null;
    status?: 'draft' | 'pending_review' | 'published' | 'closed' | 'expired' | 'rejected';
    postedBy: string;
    sourceDraftId?: string | null;
  }) {
    const inserted = await this.database
      .insert(schema.opportunities)
      .values({
        companyId: data.companyId,
        title: data.title,
        type: data.type,
        description: data.description,
        workMode: data.workMode,
        location: data.location ?? null,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        applicationDeadline: data.applicationDeadline ?? null,
        applyUrl: data.applyUrl ?? null,
        applicationEmail: data.applicationEmail ?? null,
        status: data.status ?? 'draft',
        postedBy: data.postedBy,
        sourceDraftId: data.sourceDraftId ?? null,
      })
      .returning();

    return inserted[0] ?? null;
  }

  async update(
    id: string,
    data: Partial<{
      companyId: string;
      title: string;
      type: 'job' | 'internship';
      description: string;
      workMode: 'remote' | 'onsite' | 'hybrid';
      location: string | null;
      salaryMin: string | null;
      salaryMax: string | null;
      applicationDeadline: Date | null;
      applyUrl: string | null;
      applicationEmail: string | null;
      status: 'draft' | 'pending_review' | 'published' | 'closed' | 'expired' | 'rejected';
    }>,
  ) {
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(data)) {
      updatePayload[key] = value;
    }

    await this.database.update(schema.opportunities).set(updatePayload).where(eq(schema.opportunities.id, id));
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const apps = await tx
        .select({ id: schema.opportunityApplications.id })
        .from(schema.opportunityApplications)
        .where(eq(schema.opportunityApplications.opportunityId, id));
      for (const app of apps) {
        await tx.delete(schema.applicationStatusHistory).where(eq(schema.applicationStatusHistory.applicationId, app.id));
      }
      await tx.delete(schema.opportunityApplications).where(eq(schema.opportunityApplications.opportunityId, id));
      await tx.delete(schema.opportunityEligibility).where(eq(schema.opportunityEligibility.opportunityId, id));
      await tx.delete(schema.opportunitySkills).where(eq(schema.opportunitySkills.opportunityId, id));
      await tx.delete(schema.savedOpportunities).where(eq(schema.savedOpportunities.opportunityId, id));
      await tx.delete(schema.opportunities).where(eq(schema.opportunities.id, id));
    });
  }

  async updateStatus(id: string, status: 'draft' | 'pending_review' | 'published' | 'closed' | 'expired' | 'rejected') {
    await this.database
      .update(schema.opportunities)
      .set({ status, updatedAt: new Date() })
      .where(eq(schema.opportunities.id, id));
  }

  async addEligibility(
    opportunityId: string,
    criteria: Array<{
      departmentId?: string | null;
      programId?: string | null;
      batchId?: string | null;
      minCgpa?: string | null;
    }>,
  ) {
    if (criteria.length === 0) return;
    await this.database.insert(schema.opportunityEligibility).values(
      criteria.map((c) => ({
        opportunityId,
        departmentId: c.departmentId ?? null,
        programId: c.programId ?? null,
        batchId: c.batchId ?? null,
        minCgpa: c.minCgpa ?? null,
      })),
    );
  }

  async replaceEligibility(
    opportunityId: string,
    criteria: Array<{
      departmentId?: string | null;
      programId?: string | null;
      batchId?: string | null;
      minCgpa?: string | null;
    }>,
  ) {
    await this.database
      .delete(schema.opportunityEligibility)
      .where(eq(schema.opportunityEligibility.opportunityId, opportunityId));
    if (criteria.length > 0) {
      await this.addEligibility(opportunityId, criteria);
    }
  }

  async addSkills(
    opportunityId: string,
    skills: Array<{ skillId: string; isRequired: boolean }>,
  ) {
    if (skills.length === 0) return;
    await this.database.insert(schema.opportunitySkills).values(
      skills.map((s) => ({
        opportunityId,
        skillId: s.skillId,
        isRequired: s.isRequired,
      })),
    );
  }

  async replaceSkills(
    opportunityId: string,
    skills: Array<{ skillId: string; isRequired: boolean }>,
  ) {
    await this.database
      .delete(schema.opportunitySkills)
      .where(eq(schema.opportunitySkills.opportunityId, opportunityId));
    if (skills.length > 0) {
      await this.addSkills(opportunityId, skills);
    }
  }

  async getApplicationCount(opportunityId: string): Promise<number> {
    const result = await this.database
      .select({ total: count() })
      .from(schema.opportunityApplications)
      .where(eq(schema.opportunityApplications.opportunityId, opportunityId));
    return (result[0]?.total ?? 0);
  }

  async getApplicationCounts(opportunityIds: string[]): Promise<Map<string, number>> {
    if (opportunityIds.length === 0) return new Map();
    const rows = await this.database
      .select({
        opportunityId: schema.opportunityApplications.opportunityId,
        total: count(),
      })
      .from(schema.opportunityApplications)
      .where(inArray(schema.opportunityApplications.opportunityId, opportunityIds))
      .groupBy(schema.opportunityApplications.opportunityId);
    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(r.opportunityId, Number(r.total));
    }
    return map;
  }

  async list(
    pagination: { page: number; pageSize: number },
    filters: {
      status?: typeof schema.opportunities.$inferSelect.status | undefined;
      type?: typeof schema.opportunities.$inferSelect.type | undefined;
      workMode?: typeof schema.opportunities.$inferSelect.workMode | undefined;
      companyId?: string | undefined;
      location?: string | undefined;
      skillId?: string | undefined;
      search?: string | undefined;
      closingSoon?: boolean | undefined;
      /** Student profile for eligibility filtering */
      studentProfile?: {
        id: string;
        departmentId: string;
        programId: string;
        batchId: string;
        cgpa: string | null;
      } | null;
      eligibleOnly?: boolean | undefined;
    },
    sortBy: 'newest' | 'deadline' | 'salary' = 'newest',
  ) {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    const conditions = [];

    if (filters.status) {
      conditions.push(eq(schema.opportunities.status, filters.status));
    }
    if (filters.type) {
      conditions.push(eq(schema.opportunities.type, filters.type));
    }
    if (filters.workMode) {
      conditions.push(eq(schema.opportunities.workMode, filters.workMode));
    }
    if (filters.companyId) {
      conditions.push(eq(schema.opportunities.companyId, filters.companyId));
    }
    if (filters.location) {
      conditions.push(ilike(schema.opportunities.location, `%${filters.location}%`));
    }
    if (filters.search) {
      conditions.push(
        or(
          ilike(schema.opportunities.title, `%${filters.search}%`),
          ilike(schema.opportunities.description, `%${filters.search}%`),
        ),
      );
    }
    if (filters.closingSoon) {
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      conditions.push(gte(schema.opportunities.applicationDeadline, now));
      conditions.push(lte(schema.opportunities.applicationDeadline, sevenDays));
    }
    if (filters.skillId) {
      conditions.push(
        exists(
          this.database
            .select({ x: sql`1` })
            .from(schema.opportunitySkills)
            .where(
              and(
                eq(schema.opportunitySkills.opportunityId, schema.opportunities.id),
                eq(schema.opportunitySkills.skillId, filters.skillId),
              ),
            ),
        ),
      );
    }
    if (filters.eligibleOnly && filters.studentProfile) {
      const sp = filters.studentProfile;
      conditions.push(
        or(
          // No eligibility rows = open to all
          sql`NOT EXISTS (
            SELECT 1 FROM opportunity_eligibility oe
            WHERE oe.opportunity_id = ${schema.opportunities.id}
          )`,
          // Student matches at least one eligibility row
          exists(
            this.database
              .select({ x: sql`1` })
              .from(schema.opportunityEligibility)
              .where(
                and(
                  eq(schema.opportunityEligibility.opportunityId, schema.opportunities.id),
                  or(
                    sql`${schema.opportunityEligibility.departmentId} IS NULL`,
                    eq(schema.opportunityEligibility.departmentId, sp.departmentId),
                  ),
                  or(
                    sql`${schema.opportunityEligibility.programId} IS NULL`,
                    eq(schema.opportunityEligibility.programId, sp.programId),
                  ),
                  or(
                    sql`${schema.opportunityEligibility.batchId} IS NULL`,
                    eq(schema.opportunityEligibility.batchId, sp.batchId),
                  ),
                  or(
                    sql`${schema.opportunityEligibility.minCgpa} IS NULL`,
                    sp.cgpa
                      ? lte(schema.opportunityEligibility.minCgpa, sp.cgpa)
                      : lte(schema.opportunityEligibility.minCgpa, '0'),
                  ),
                ),
              ),
          ),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await this.database
      .select({ total: count() })
      .from(schema.opportunities)
      .where(whereClause);
    const total = (countResult[0]?.total ?? 0);

    const orderBy = sortBy === 'deadline'
      ? [asc(schema.opportunities.applicationDeadline)]
      : sortBy === 'salary'
        ? [desc(schema.opportunities.salaryMax)]
        : [desc(schema.opportunities.createdAt)];

    const opportunities = await this.database.query.opportunities.findMany({
      where: whereClause,
      with: {
        company: true,
        opportunitySkills: {
          with: { skill: true },
        },
        eligibility: {
          with: {
            department: true,
            program: true,
            batch: true,
          },
        },
      },
      limit: pageSize,
      offset,
      orderBy,
    });

    return {
      opportunities,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /** Mark all published opportunities with past deadline as expired */
  async markExpiredOpportunities(): Promise<number> {
    const now = new Date();
    const result = await this.database
      .update(schema.opportunities)
      .set({ status: 'expired', updatedAt: now })
      .where(
        and(
          eq(schema.opportunities.status, 'published'),
          lte(schema.opportunities.applicationDeadline, now),
        ),
      )
      .returning({ id: schema.opportunities.id });
    return result.length;
  }

  /** Get IDs of opportunities the student has saved */
  async getSavedOpportunityIds(studentId: string): Promise<Set<string>> {
    const saved = await this.database
      .select({ opportunityId: schema.savedOpportunities.opportunityId })
      .from(schema.savedOpportunities)
      .where(eq(schema.savedOpportunities.studentId, studentId));
    return new Set(saved.map((s) => s.opportunityId));
  }

  /** Get IDs of opportunities the student has applied to */
  async getAppliedOpportunityIds(studentId: string): Promise<Set<string>> {
    const applied = await this.database
      .select({ opportunityId: schema.opportunityApplications.opportunityId })
      .from(schema.opportunityApplications)
      .where(eq(schema.opportunityApplications.studentId, studentId));
    return new Set(applied.map((a) => a.opportunityId));
  }
}
