import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { db, schema } from '@career-portal/db';
import type { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '@/app';
import { responseValue } from '@/test/response-value';

const context = vi.hoisted(() => ({ client: null as PGlite | null }));
vi.mock('@career-portal/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const schema = await import('../../../../packages/db/src/schema');
  context.client = new PGlite();
  return { db: drizzle(context.client, { schema }), schema };
});
vi.mock('@/infrastructure/redis', () => ({
  redis: { ping: vi.fn().mockResolvedValue('PONG'), del: vi.fn().mockResolvedValue(1) },
  CacheKeys: { userPermissions: (id: string) => `user:${id}:permissions` },
}));
vi.mock('../../../../packages/db/src/client', async () => {
  const { db } = await import('@career-portal/db');
  return { db };
});
vi.mock('@/infrastructure/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (token: string) =>
        Promise.resolve({
          data: { user: { id: token, email: `${token}@example.test`, user_metadata: {} } },
          error: null,
        }),
    },
  },
}));

describe('Phase 6 HTTP workflows and migration upgrades', () => {
  const app = createApp();
  const student = randomUUID();
  const other = randomUUID();
  const faculty = randomUUID();
  const skill = randomUUID();
  let career = '';
  let resource = '';
  let roadmap = '';
  let stage = '';
  let analysis = '';
  const auth = (id = student) => ({ Authorization: `Bearer ${id}` });
  const pathInput = (title = 'Frontend') => ({
    title,
    isActive: true,
    stages: [
      {
        title: 'Foundations',
        skills: [{ skillId: skill, proficiency: 'intermediate' }],
        resourceIds: resource ? [resource] : [],
        activities: [
          { type: 'project', title: 'Portfolio', description: 'Build an accessible site' },
        ],
      },
      { title: 'Practice', skills: [{ skillId: skill, proficiency: 'advanced' }] },
    ],
  });
  beforeAll(async () => {
    if (!context.client) throw new Error('Missing database');
    const folder = path.resolve('../../packages/db/drizzle');
    const journal = JSON.parse(await readFile(path.join(folder, 'meta/_journal.json'), 'utf8')) as {
      entries: { tag: string }[];
    };
    for (const entry of journal.entries) {
      const migration = await readFile(path.join(folder, `${entry.tag}.sql`), 'utf8');
      for (const sql of migration.split('--> statement-breakpoint'))
        if (sql.trim()) await context.client.exec(sql);
    }
    for (const id of [student, other, faculty])
      await db
        .insert(schema.users)
        .values({ id, email: `${id}@test.local`, fullName: 'Phase Six' });
    for (const [name, ids, permissions] of [
      [
        'STUDENT',
        [student, other],
        ['resources.view', 'roadmaps.manage_own', 'skill_gap.analyze_own'],
      ],
      [
        'PLACEMENT_FACULTY',
        [faculty],
        ['resources.view', 'resources.manage', 'career_paths.manage'],
      ],
    ] as const) {
      const roleId = randomUUID();
      await db.insert(schema.roles).values({ id: roleId, name });
      for (const key of permissions) {
        await db.insert(schema.permissions).values({ key }).onConflictDoNothing();
        const row = await db.query.permissions.findFirst({
          where: eq(schema.permissions.key, key),
        });
        if (!row) throw new Error('Permission');
        await db.insert(schema.rolePermissions).values({ roleId, permissionId: row.id });
      }
      for (const userId of ids) await db.insert(schema.userRoles).values({ userId, roleId });
    }
    const departmentId = randomUUID();
    const programId = randomUUID();
    const batchId = randomUUID();
    await db.insert(schema.departments).values({ id: departmentId, name: 'Computing', code: 'P6' });
    await db
      .insert(schema.academicPrograms)
      .values({ id: programId, departmentId, name: 'B.Tech', degreeLevel: 'UG', durationYears: 4 });
    await db.insert(schema.batches).values({ id: batchId, graduationYear: 2027 });
    for (const userId of [student, other])
      await db
        .insert(schema.studentProfiles)
        .values({ userId, rollNumber: userId, departmentId, programId, batchId });
    await db.insert(schema.skills).values({ id: skill, name: 'React', category: 'framework' });
  }, 60000);
  afterAll(async () => {
    await context.client?.close();
  });
  it('enforces staff authoring, publication requirements and resource references', async () => {
    expect(
      (await request(app).post('/api/v1/career-paths').set(auth()).send(pathInput())).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/v1/career-paths')
          .set(auth(faculty))
          .send({ title: 'Empty', isActive: true })
      ).status,
    ).toBe(422);
    const r = await request(app)
      .post('/api/v1/resources')
      .set(auth(faculty))
      .send({
        title: 'React guide',
        url: 'https://react.dev/learn',
        type: 'documentation',
        category: 'frontend',
        skillIds: [skill],
      });
    expect(r.status, r.text).toBe(201);
    resource = responseValue(r, 'data.id') as string;
    const res = await request(app)
      .post('/api/v1/career-paths')
      .set(auth(faculty))
      .send(pathInput());
    expect(res.status, res.text).toBe(201);
    career = responseValue(res, 'data.id') as string;
    const invalid = pathInput();
    if (invalid.stages[0]) invalid.stages[0].resourceIds = [randomUUID()];
    expect(
      (await request(app).put(`/api/v1/career-paths/${career}`).set(auth(faculty)).send(invalid))
        .status,
    ).toBe(422);
  });
  it('starts idempotently and snapshots templates', async () => {
    const res = await request(app)
      .post('/api/v1/roadmaps')
      .set(auth())
      .send({ careerPathId: career });
    expect(res.status, res.text).toBe(201);
    roadmap = responseValue(res, 'data.id') as string;
    stage = responseValue(res, 'data.stages.0.id') as string;
    const again = await request(app)
      .post('/api/v1/roadmaps')
      .set(auth())
      .send({ careerPathId: career });
    expect(responseValue(again, 'data.id')).toBe(roadmap);
    await request(app)
      .put(`/api/v1/career-paths/${career}`)
      .set(auth(faculty))
      .send(pathInput('Updated title'));
    const detail = await request(app).get(`/api/v1/roadmaps/${roadmap}`).set(auth());
    expect(responseValue(detail, 'data.targetRole')).toBe('Frontend');
    expect((await request(app).get(`/api/v1/roadmaps/${roadmap}`).set(auth(other))).status).toBe(
      404,
    );
    expect(
      (
        await request(app)
          .patch(`/api/v1/roadmaps/${roadmap}/stages/${stage}`)
          .set(auth(other))
          .send({ isCompleted: true })
      ).status,
    ).toBe(404);
  });
  it('computes progress and preserves completion timestamps on retry', async () => {
    const res = await request(app)
      .patch(`/api/v1/roadmaps/${roadmap}/stages/${stage}`)
      .set(auth())
      .send({ isCompleted: true });
    expect(res.status, res.text).toBe(200);
    expect(responseValue(res, 'data.progressPercent')).toBe(50);
    const again = await request(app)
      .patch(`/api/v1/roadmaps/${roadmap}/stages/${stage}`)
      .set(auth())
      .send({ isCompleted: true });
    expect(responseValue(again, 'data.stages.0.completedAt')).toBe(
      responseValue(res, 'data.stages.0.completedAt'),
    );
    const second = responseValue(res, 'data.stages.1.id') as string;
    const complete = await request(app)
      .patch(`/api/v1/roadmaps/${roadmap}/stages/${second}`)
      .set(auth())
      .send({ isCompleted: true });
    expect(responseValue(complete, 'data.status')).toBe('completed');
    const newPath = await request(app)
      .post('/api/v1/career-paths')
      .set(auth(faculty))
      .send(pathInput('Backend'));
    const next = responseValue(newPath, 'data.id') as string;
    await Promise.all([
      request(app).post('/api/v1/roadmaps').set(auth()).send({ careerPathId: next }),
      request(app).post('/api/v1/roadmaps').set(auth()).send({ careerPathId: next }),
    ]);
    const reopen = await request(app)
      .patch(`/api/v1/roadmaps/${roadmap}/stages/${stage}`)
      .set(auth())
      .send({ isCompleted: false });
    expect(responseValue(reopen, 'data.status')).toBe('active');
    expect(responseValue(reopen, 'data.progressPercent')).toBe(50);
    const history = await request(app).get('/api/v1/roadmaps/me').set(auth());
    expect(
      (responseValue(history, 'data') as Array<{ status: string }>).filter(
        (r) => r.status === 'active',
      ),
    ).toHaveLength(1);
  });
  it('updates resource progress without duplicate records or profile mutations', async () => {
    for (const [status, percent] of [
      ['in_progress', 50],
      ['completed', 100],
      ['not_started', 0],
    ] as const) {
      const res = await request(app)
        .patch(`/api/v1/resources/${resource}/progress`)
        .set(auth())
        .send({ status });
      expect(res.status, res.text).toBe(200);
      expect(responseValue(res, 'data.progressPercent')).toBe(percent);
    }
    const rows = await db.select().from(schema.resourceProgress);
    expect(rows).toHaveLength(1);
    expect(await db.select().from(schema.studentSkills)).toHaveLength(0);
    expect((await request(app).get('/api/v1/resources?page=bad').set(auth())).status).toBe(422);
    const catalog = await request(app)
      .get(`/api/v1/resources?skillId=${skill}&pageSize=1`)
      .set(auth());
    expect(responseValue(catalog, 'meta.totalItems')).toBe(1);
  });
  it('returns resource progress with roadmap history without leaking another student progress', async () => {
    await request(app)
      .patch(`/api/v1/resources/${resource}/progress`)
      .set(auth())
      .send({ status: 'completed' });
    const history = await request(app).get('/api/v1/roadmaps/me').set(auth());
    const maps = responseValue(history, 'data') as Array<{
      id: string;
      stages: Array<{ resources: Array<{ progressStatus: string }> }>;
    }>;
    expect(maps.find((map) => map.id === roadmap)?.stages[0]?.resources[0]?.progressStatus).toBe(
      'completed',
    );
    const catalog = await request(app).get('/api/v1/resources').set(auth(other));
    expect(responseValue(catalog, 'data.0.progress')).toBeNull();
  });
  it('keeps deactivated resources in historical roadmaps but omits them from new ones', async () => {
    await db
      .update(schema.learningResources)
      .set({ isActive: false })
      .where(eq(schema.learningResources.id, resource));
    const own = await request(app).get(`/api/v1/roadmaps/${roadmap}`).set(auth());
    expect(responseValue(own, 'data.stages.0.resources.0.title')).toBe('React guide');
    const newMap = await request(app)
      .post('/api/v1/roadmaps')
      .set(auth(other))
      .send({ careerPathId: career });
    expect(newMap.status, newMap.text).toBe(201);
    expect(responseValue(newMap, 'data.stages.0.resources')).toEqual([]);
    expect(
      (
        await request(app)
          .patch(`/api/v1/resources/${resource}/progress`)
          .set(auth(other))
          .send({ status: 'completed' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/v1/resources/${resource}/progress`)
          .set(auth())
          .send({ status: 'completed' })
      ).status,
    ).toBe(200);
    await db
      .update(schema.learningResources)
      .set({ isActive: true })
      .where(eq(schema.learningResources.id, resource));
  });
  it('creates explainable immutable gap snapshots and rejects cross-student reads', async () => {
    const res = await request(app)
      .post('/api/v1/skill-gap')
      .set(auth())
      .send({ careerPathId: career });
    expect(res.status, res.text).toBe(201);
    analysis = responseValue(res, 'data.id') as string;
    expect(responseValue(res, 'data.skills.0.status')).toBe('missing');
    expect(responseValue(res, 'data.skills.0.actions.0.reason')).toContain('React');
    expect((await request(app).get(`/api/v1/skill-gap/${analysis}`).set(auth(other))).status).toBe(
      404,
    );
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, student),
    });
    if (!profile) throw new Error('Profile');
    await db
      .insert(schema.studentSkills)
      .values({ studentId: profile.id, skillId: skill, proficiency: 'beginner' });
    const next = await request(app)
      .post('/api/v1/skill-gap')
      .set(auth())
      .send({ careerPathId: career });
    expect(responseValue(next, 'data.skills.0.status')).toBe('below_target');
    const previous = await request(app).get(`/api/v1/skill-gap/${analysis}`).set(auth());
    expect(responseValue(previous, 'data.skills.0.status')).toBe('missing');
  });
  it('uses evaluated exact-topic evidence and excludes in-progress answers', async () => {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(schema.studentProfiles.userId, student),
    });
    if (!profile) throw new Error('Profile');
    const [test] = await db
      .insert(schema.mockTests)
      .values({
        title: 'React practice',
        category: 'technical',
        durationMinutes: 10,
        totalMarks: 2,
        passingMarks: 1,
        createdBy: faculty,
      })
      .returning();
    if (!test) throw new Error('Test');
    const [question, unmatched] = await db
      .insert(schema.mockTestQuestions)
      .values([
        {
          testId: test.id,
          questionText: 'React question',
          topic: ' react ',
          options: ['a', 'b'],
          orderIndex: 0,
        },
        {
          testId: test.id,
          questionText: 'Other question',
          topic: 'React fundamentals',
          options: ['a', 'b'],
          orderIndex: 1,
        },
      ])
      .returning();
    if (!question || !unmatched) throw new Error('Question');
    const [evaluated] = await db
      .insert(schema.mockTestAttempts)
      .values({ studentId: profile.id, testId: test.id, status: 'evaluated' })
      .returning();
    const [unfinished] = await db
      .insert(schema.mockTestAttempts)
      .values({ studentId: profile.id, testId: test.id, status: 'in_progress' })
      .returning();
    if (!evaluated || !unfinished) throw new Error('Attempt');
    await db.insert(schema.attemptAnswers).values([
      { attemptId: evaluated.id, questionId: question.id, isCorrect: false },
      { attemptId: evaluated.id, questionId: unmatched.id, isCorrect: true },
      { attemptId: unfinished.id, questionId: question.id, isCorrect: true },
    ]);
    const res = await request(app)
      .post('/api/v1/skill-gap')
      .set(auth())
      .send({ careerPathId: career });
    expect(res.status, res.text).toBe(201);
    expect(responseValue(res, 'data.skills.0.assessment.questionCount')).toBe(1);
    expect(responseValue(res, 'data.skills.0.assessment.accuracy')).toBe(0);
    expect(responseValue(res, 'data.skills.0.needsPractice')).toBe(true);
    expect(responseValue(res, 'data.unclassifiedTopics')).toEqual(['React fundamentals']);
  });
  it('analyzes published opportunity skills and hides inaccessible draft requirements', async () => {
    const [company] = await db
      .insert(schema.companies)
      .values({ name: 'Phase Six Company' })
      .returning();
    if (!company) throw new Error('Company fixture');
    const [opportunity] = await db
      .insert(schema.opportunities)
      .values({
        companyId: company.id,
        title: 'React developer',
        description: 'Build interfaces',
        type: 'job',
        workMode: 'remote',
        postedBy: faculty,
        status: 'draft',
      })
      .returning();
    if (!opportunity) throw new Error('Opportunity fixture');
    await db
      .insert(schema.opportunitySkills)
      .values({ opportunityId: opportunity.id, skillId: skill, isRequired: true });
    const hidden = await request(app)
      .post('/api/v1/skill-gap')
      .set(auth())
      .send({ opportunityId: opportunity.id });
    expect(hidden.status).toBe(404);
    await db
      .update(schema.opportunities)
      .set({ status: 'published' })
      .where(eq(schema.opportunities.id, opportunity.id));
    const res = await request(app)
      .post('/api/v1/skill-gap')
      .set(auth())
      .send({ opportunityId: opportunity.id });
    expect(res.status, res.text).toBe(201);
    expect(responseValue(res, 'data.skills.0.status')).toBe('matched');
    expect(responseValue(res, 'data.skills.0.requiredProficiency')).toBeNull();
    expect(
      (
        await request(app)
          .post('/api/v1/skill-gap')
          .set(auth())
          .send({ careerPathId: career, opportunityId: opportunity.id })
      ).status,
    ).toBe(422);
  });
  it('seeds ten careers repeatably without overwriting staff edits or creating users', async () => {
    const { seedCareerCatalog } = await import('../../../../packages/db/src/seed-career');
    await expect(seedCareerCatalog(student)).rejects.toThrow('faculty/admin');
    await seedCareerCatalog(faculty);
    const seeded = await db.select().from(schema.careerPaths);
    expect(seeded.filter((p) => p.slug)).toHaveLength(10);
    const first = seeded.find((p) => p.slug);
    if (!first) throw new Error('Seed');
    await db
      .update(schema.careerPaths)
      .set({ title: 'Staff edited title' })
      .where(eq(schema.careerPaths.id, first.id));
    await seedCareerCatalog(faculty);
    expect((await db.select().from(schema.careerPaths)).length).toBe(seeded.length);
    expect(
      (await db.query.careerPaths.findFirst({ where: eq(schema.careerPaths.id, first.id) }))?.title,
    ).toBe('Staff edited title');
    expect(await db.select().from(schema.users)).toHaveLength(3);
  });
});
