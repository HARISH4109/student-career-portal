import { db, schema } from '@career-portal/db';
import type {
  CareerCatalogQuery,
  CareerPathInput,
  ResourceInput,
} from '@career-portal/shared-types';
import { and, asc, count, desc, eq, exists, ilike, inArray, sql } from 'drizzle-orm';

import { escapeLikePattern } from '@/shared/db/escape-like';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class CareerRepository {
  constructor(readonly database: typeof db | Transaction = db) {}
  transaction<T>(operation: (repository: CareerRepository) => Promise<T>): Promise<T> {
    return this.database.transaction((tx) => operation(new CareerRepository(tx)));
  }
  async lockStudent(id: string): Promise<void> {
    await this.database
      .select({ id: schema.studentProfiles.id })
      .from(schema.studentProfiles)
      .where(eq(schema.studentProfiles.id, id))
      .for('update');
  }
  profile(userId: string) {
    return this.database.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, userId),
    });
  }
  skills() {
    return this.database.select().from(schema.skills);
  }
  path(id: string) {
    return this.database.query.careerPaths.findFirst({ where: eq(schema.careerPaths.id, id) });
  }
  async paths(query: CareerCatalogQuery) {
    const where = and(
      query.status === 'active' ? eq(schema.careerPaths.isActive, true) : undefined,
      ilike(schema.careerPaths.title, `%${escapeLikePattern(query.search)}%`),
    );
    const data = await this.database
      .select()
      .from(schema.careerPaths)
      .where(where)
      .orderBy(asc(schema.careerPaths.title), asc(schema.careerPaths.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const [total] = await this.database
      .select({ value: count() })
      .from(schema.careerPaths)
      .where(where);
    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total?.value ?? 0,
        totalPages: Math.ceil((total?.value ?? 0) / query.pageSize),
      },
    };
  }
  async savePath(input: CareerPathInput, userId: string, id?: string) {
    if (id)
      return (
        await this.database
          .update(schema.careerPaths)
          .set(input)
          .where(eq(schema.careerPaths.id, id))
          .returning()
      )[0];
    return (
      await this.database
        .insert(schema.careerPaths)
        .values({ ...input, createdBy: userId })
        .returning()
    )[0];
  }
  resource(id: string) {
    return this.database.query.learningResources.findFirst({
      where: eq(schema.learningResources.id, id),
    });
  }
  async resourceLinks(id: string) {
    return {
      skillIds: (
        await this.database
          .select()
          .from(schema.resourceSkills)
          .where(eq(schema.resourceSkills.resourceId, id))
      ).map((row) => row.skillId),
      careerPathIds: (
        await this.database
          .select()
          .from(schema.resourceCareerPaths)
          .where(eq(schema.resourceCareerPaths.resourceId, id))
      ).map((row) => row.careerPathId),
    };
  }
  async resourceContexts(ids: string[], studentId?: string) {
    if (!ids.length) return { skillLinks: [], pathLinks: [], progressRows: [] };
    const [skillLinks, pathLinks, progressRows] = await Promise.all([
      this.database
        .select()
        .from(schema.resourceSkills)
        .where(inArray(schema.resourceSkills.resourceId, ids)),
      this.database
        .select()
        .from(schema.resourceCareerPaths)
        .where(inArray(schema.resourceCareerPaths.resourceId, ids)),
      studentId ? this.progressForResources(ids, studentId) : Promise.resolve([]),
    ]);
    return { skillLinks, pathLinks, progressRows };
  }
  progressForResources(ids: string[], studentId: string) {
    return ids.length
      ? this.database
          .select()
          .from(schema.resourceProgress)
          .where(
            and(
              eq(schema.resourceProgress.studentId, studentId),
              inArray(schema.resourceProgress.resourceId, ids),
            ),
          )
      : Promise.resolve([]);
  }
  async ownsLinkedResource(resourceId: string, studentId: string): Promise<boolean> {
    const rows = await this.database
      .select({ id: schema.roadmapStageResources.resourceId })
      .from(schema.roadmapStageResources)
      .innerJoin(
        schema.roadmapStages,
        eq(schema.roadmapStages.id, schema.roadmapStageResources.stageId),
      )
      .innerJoin(
        schema.careerRoadmaps,
        eq(schema.careerRoadmaps.id, schema.roadmapStages.roadmapId),
      )
      .where(
        and(
          eq(schema.roadmapStageResources.resourceId, resourceId),
          eq(schema.careerRoadmaps.studentId, studentId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
  async resources(query: CareerCatalogQuery) {
    const r = schema.learningResources;
    const where = and(
      query.status === 'active' ? eq(r.isActive, true) : undefined,
      ilike(r.title, `%${escapeLikePattern(query.search)}%`),
      query.type ? eq(r.type, query.type) : undefined,
      query.difficulty ? eq(r.difficulty, query.difficulty) : undefined,
      query.skillId
        ? exists(
            this.database
              .select()
              .from(schema.resourceSkills)
              .where(
                and(
                  eq(schema.resourceSkills.resourceId, r.id),
                  eq(schema.resourceSkills.skillId, query.skillId),
                ),
              ),
          )
        : undefined,
      query.careerPathId
        ? exists(
            this.database
              .select()
              .from(schema.resourceCareerPaths)
              .where(
                and(
                  eq(schema.resourceCareerPaths.resourceId, r.id),
                  eq(schema.resourceCareerPaths.careerPathId, query.careerPathId),
                ),
              ),
          )
        : undefined,
    );
    const data = await this.database
      .select()
      .from(r)
      .where(where)
      .orderBy(asc(r.title), asc(r.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const [total] = await this.database.select({ value: count() }).from(r).where(where);
    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total?.value ?? 0,
        totalPages: Math.ceil((total?.value ?? 0) / query.pageSize),
      },
    };
  }
  async saveResource(input: ResourceInput, userId: string, id?: string) {
    const { skillIds, careerPathIds, ...data } = input;
    const row = id
      ? (
          await this.database
            .update(schema.learningResources)
            .set(data)
            .where(eq(schema.learningResources.id, id))
            .returning()
        )[0]
      : (
          await this.database
            .insert(schema.learningResources)
            .values({ ...data, addedBy: userId })
            .returning()
        )[0];
    if (!row) return null;
    await this.database
      .delete(schema.resourceSkills)
      .where(eq(schema.resourceSkills.resourceId, row.id));
    await this.database
      .delete(schema.resourceCareerPaths)
      .where(eq(schema.resourceCareerPaths.resourceId, row.id));
    if (skillIds.length)
      await this.database
        .insert(schema.resourceSkills)
        .values([...new Set(skillIds)].map((skillId) => ({ resourceId: row.id, skillId })));
    if (careerPathIds.length)
      await this.database
        .insert(schema.resourceCareerPaths)
        .values(
          [...new Set(careerPathIds)].map((careerPathId) => ({ resourceId: row.id, careerPathId })),
        );
    return row;
  }
  resourceProgress(studentId: string, resourceId: string) {
    return this.database.query.resourceProgress.findFirst({
      where: and(
        eq(schema.resourceProgress.studentId, studentId),
        eq(schema.resourceProgress.resourceId, resourceId),
      ),
    });
  }
  roadmap(id: string) {
    return this.database.query.careerRoadmaps.findFirst({
      where: eq(schema.careerRoadmaps.id, id),
      with: { stages: true },
    });
  }
  roadmaps(studentId: string) {
    return this.database.query.careerRoadmaps.findMany({
      with: { stages: true },
      where: eq(schema.careerRoadmaps.studentId, studentId),
      orderBy: [desc(schema.careerRoadmaps.createdAt)],
    });
  }
  inventory(studentId: string) {
    return this.database
      .select()
      .from(schema.studentSkills)
      .where(eq(schema.studentSkills.studentId, studentId));
  }
  async assessmentAnswers(studentId: string) {
    return this.database
      .select({ topic: schema.mockTestQuestions.topic, isCorrect: schema.attemptAnswers.isCorrect })
      .from(schema.attemptAnswers)
      .innerJoin(
        schema.mockTestAttempts,
        eq(schema.attemptAnswers.attemptId, schema.mockTestAttempts.id),
      )
      .innerJoin(
        schema.mockTestQuestions,
        eq(schema.attemptAnswers.questionId, schema.mockTestQuestions.id),
      )
      .where(
        and(
          eq(schema.mockTestAttempts.studentId, studentId),
          eq(schema.mockTestAttempts.status, 'evaluated'),
        ),
      );
  }
  async recommendedResources(skillId: string) {
    return this.database
      .select({ resource: schema.learningResources })
      .from(schema.learningResources)
      .innerJoin(
        schema.resourceSkills,
        eq(schema.resourceSkills.resourceId, schema.learningResources.id),
      )
      .where(
        and(
          eq(schema.resourceSkills.skillId, skillId),
          eq(schema.learningResources.isActive, true),
        ),
      )
      .orderBy(asc(schema.learningResources.title))
      .limit(3);
  }
  async recommendedTests(name: string) {
    return this.database
      .selectDistinct({ id: schema.mockTests.id, title: schema.mockTests.title })
      .from(schema.mockTests)
      .innerJoin(schema.mockTestQuestions, eq(schema.mockTestQuestions.testId, schema.mockTests.id))
      .where(
        and(
          eq(schema.mockTests.isActive, true),
          sql`lower(trim(${schema.mockTestQuestions.topic})) = ${name.trim().toLowerCase()}`,
        ),
      )
      .orderBy(asc(schema.mockTests.title))
      .limit(2);
  }
  analyses(studentId: string) {
    return this.database.query.skillGapAnalyses.findMany({
      columns: { id: true, targetRole: true, createdAt: true },
      where: eq(schema.skillGapAnalyses.studentId, studentId),
      orderBy: [desc(schema.skillGapAnalyses.createdAt)],
    });
  }
  analysis(id: string) {
    return this.database.query.skillGapAnalyses.findFirst({
      where: eq(schema.skillGapAnalyses.id, id),
    });
  }
  resourcesByIds(ids: string[]) {
    return ids.length
      ? this.database
          .select()
          .from(schema.learningResources)
          .where(inArray(schema.learningResources.id, ids))
      : Promise.resolve([]);
  }
}
