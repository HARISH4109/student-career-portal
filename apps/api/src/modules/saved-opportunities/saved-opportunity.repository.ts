import { db, schema } from '@career-portal/db';
import { and, count, eq } from 'drizzle-orm';

export class SavedOpportunityRepository {
  async findByStudentAndOpportunity(studentId: string, opportunityId: string) {
    return db.query.savedOpportunities.findFirst({
      where: and(
        eq(schema.savedOpportunities.studentId, studentId),
        eq(schema.savedOpportunities.opportunityId, opportunityId),
      ),
    });
  }

  async save(studentId: string, opportunityId: string) {
    const inserted = await db
      .insert(schema.savedOpportunities)
      .values({ studentId, opportunityId })
      .returning();
    return inserted[0] ?? null;
  }

  async unsave(studentId: string, opportunityId: string) {
    await db
      .delete(schema.savedOpportunities)
      .where(
        and(
          eq(schema.savedOpportunities.studentId, studentId),
          eq(schema.savedOpportunities.opportunityId, opportunityId),
        ),
      );
  }

  async listByStudent(
    studentId: string,
    pagination: { page: number; pageSize: number },
  ) {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const whereClause = eq(schema.savedOpportunities.studentId, studentId);

    const countResult = await db
      .select({ total: count() })
      .from(schema.savedOpportunities)
      .where(whereClause);
    const total = (countResult[0]?.total ?? 0);

    const saved = await db.query.savedOpportunities.findMany({
      where: whereClause,
      limit: pageSize,
      offset,
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    });

    return {
      saved,
      meta: {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
