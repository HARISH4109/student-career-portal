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

vi.mock('@/infrastructure/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (token: string) =>
        Promise.resolve({
          data: {
            user:
              token === 'invalid'
                ? null
                : { id: token, email: `${token}@example.test`, user_metadata: { full_name: 'Test User' } },
          },
          error: null,
        }),
    },
  },
}));

describe('Phase 5 Mock Tests, Answer Security & Preparation HTTP Workflows', () => {
  const ids = {
    student: randomUUID(),
    otherStudent: randomUUID(),
    faculty: randomUUID(),
    admin: randomUUID(),
    department: randomUUID(),
    program: randomUUID(),
    batch: randomUUID(),
  };

  const app = createApp();
  let testId = '';
  let sectionId = '';
  let q1Id = '';
  let q2Id = '';
  let attemptId = '';
  let interviewId = '';

  beforeAll(async () => {
    if (!context.client) throw new Error('Test database was not initialized');
    const folder = path.resolve('../../packages/db/drizzle');
    const journal = JSON.parse(await readFile(path.join(folder, 'meta/_journal.json'), 'utf8')) as {
      entries: { tag: string }[];
    };
    for (const entry of journal.entries) {
      const sql = await readFile(path.join(folder, `${entry.tag}.sql`), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint')) {
        if (statement.trim()) await context.client.exec(statement);
      }
    }

    // Insert users
    for (const id of [ids.student, ids.otherStudent, ids.faculty, ids.admin]) {
      await db.insert(schema.users).values({ id, email: `${id}@example.test`, fullName: 'Test User' });
    }

    // Setup roles & permissions
    const permissionSets = {
      STUDENT: [
        'students.view_own_profile',
        'mock_tests.attempt',
        'mock_tests.view_results_own',
        'mock_interviews.schedule_own',
        'mock_interviews.view_own',
      ],
      PLACEMENT_FACULTY: ['mock_tests.manage', 'opportunities.view'],
      ADMIN: ['mock_tests.manage', 'mock_tests.attempt', 'mock_tests.view_results_own'],
    } as const;

    for (const [name, keys] of Object.entries(permissionSets)) {
      const roleId = randomUUID();
      await db.insert(schema.roles).values({ id: roleId, name: name as keyof typeof permissionSets });
      for (const key of keys) {
        await db.insert(schema.permissions).values({ key }).onConflictDoNothing();
        const permission = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
        if (!permission) throw new Error('Missing permission fixture');
        await db.insert(schema.rolePermissions).values({ roleId, permissionId: permission.id });
      }
      const users =
        name === 'STUDENT' ? [ids.student, ids.otherStudent] : name === 'ADMIN' ? [ids.admin] : [ids.faculty];
      for (const userId of users) await db.insert(schema.userRoles).values({ roleId, userId });
    }

    // Academic setup
    await db.insert(schema.departments).values({ id: ids.department, name: 'Computer Science', code: 'CSE' });
    await db.insert(schema.academicPrograms).values({
      id: ids.program,
      departmentId: ids.department,
      name: 'B.Tech',
      degreeLevel: 'UG',
      durationYears: 4,
    });
    await db.insert(schema.batches).values({ id: ids.batch, graduationYear: 2027 });

    // Student profiles
    await db.insert(schema.studentProfiles).values({
      id: randomUUID(),
      userId: ids.student,
      rollNumber: 'STU-001',
      departmentId: ids.department,
      programId: ids.program,
      batchId: ids.batch,
      cgpa: '8.50',
    });
    await db.insert(schema.studentProfiles).values({
      id: randomUUID(),
      userId: ids.otherStudent,
      rollNumber: 'STU-002',
      departmentId: ids.department,
      programId: ids.program,
      batchId: ids.batch,
      cgpa: '8.00',
    });
  }, 60_000);

  afterAll(async () => {
    await context.client?.close();
  });

  // ── 1. Authoring ───────────────────────────────────────────────────────

  it('allows faculty to create test, section, and questions with answer keys', async () => {
    // 1. Create test
    const createTestRes = await request(app)
      .post('/api/v1/tests')
      .set('Authorization', `Bearer ${ids.faculty}`)
      .send({
        title: 'Full Stack Engineering Assessment',
        description: 'Comprehensive test for Full Stack roles',
        category: 'technical',
        durationMinutes: 45,
        totalMarks: 20,
        passingMarks: 10,
        isActive: true,
      });

    expect(createTestRes.status, createTestRes.text).toBe(201);
    testId = String(responseValue(createTestRes, 'data.id'));
    expect(responseValue(createTestRes, 'data.title')).toBe('Full Stack Engineering Assessment');

    // 2. Add section
    const createSectionRes = await request(app)
      .post(`/api/v1/tests/${testId}/sections`)
      .set('Authorization', `Bearer ${ids.faculty}`)
      .send({
        title: 'Backend Systems',
        description: 'Questions on databases and HTTP',
        orderIndex: 0,
      });

    expect(createSectionRes.status, createSectionRes.text).toBe(201);
    sectionId = String(responseValue(createSectionRes, 'data.id'));

    // 3. Add Question 1
    const q1Res = await request(app)
      .post(`/api/v1/tests/${testId}/questions`)
      .set('Authorization', `Bearer ${ids.faculty}`)
      .send({
        sectionId,
        questionText: 'What HTTP status code represents Conflict?',
        options: ['400', '403', '404', '409'],
        correctAnswerIndex: 3,
        explanation: '409 Conflict represents state mismatch.',
        marks: 10,
        orderIndex: 0,
        difficulty: 'medium',
        topic: 'Web Architecture',
      });

    expect(q1Res.status, q1Res.text).toBe(201);
    q1Id = String(responseValue(q1Res, 'data.id'));
    expect(responseValue(q1Res, 'data.correctAnswerIndex')).toBe(3);

    // 4. Add Question 2
    const q2Res = await request(app)
      .post(`/api/v1/tests/${testId}/questions`)
      .set('Authorization', `Bearer ${ids.faculty}`)
      .send({
        sectionId,
        questionText: 'Which SQL clause is used to filter aggregated grouped results?',
        options: ['WHERE', 'HAVING', 'GROUP BY', 'LIMIT'],
        correctAnswerIndex: 1,
        explanation: 'HAVING filters aggregated groups after GROUP BY.',
        marks: 10,
        orderIndex: 1,
        difficulty: 'easy',
        topic: 'Databases',
      });

    expect(q2Res.status, q2Res.text).toBe(201);
    q2Id = String(responseValue(q2Res, 'data.id'));

    // Verify student cannot create tests
    const studentCreateRes = await request(app)
      .post('/api/v1/tests')
      .set('Authorization', `Bearer ${ids.student}`)
      .send({ title: 'Hacked test', category: 'aptitude', durationMinutes: 10, totalMarks: 10, passingMarks: 5 });
    expect(studentCreateRes.status).toBe(403);
  });

  // ── 2. Answer Key Security ─────────────────────────────────────────────

  it('strictly protects answer keys when student starts the test', async () => {
    const res = await request(app)
      .post(`/api/v1/tests/${testId}/start`)
      .set('Authorization', `Bearer ${ids.student}`)
      .send();

    expect(res.status, res.text).toBe(201);
    attemptId = String(responseValue(res, 'data.attemptId'));
    expect(attemptId).toBeTruthy();

    const questions = responseValue(res, 'data.questions') as Array<Record<string, unknown>>;
    expect(questions).toHaveLength(2);

    for (const q of questions) {
      expect(q).not.toHaveProperty('correctAnswerIndex');
      expect(q).not.toHaveProperty('explanation');
      expect(q).toHaveProperty('options');
      expect(q).toHaveProperty('questionText');
    }
  });

  // ── 3. Autosave & Attempt Ownership ───────────────────────────────────

  it('allows student to autosave answer choices and protects attempt ownership', async () => {
    // Student autosaves answer for question 1 (selecting index 3 = 409)
    const autosaveRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/autosave`)
      .set('Authorization', `Bearer ${ids.student}`)
      .send({
        questionId: q1Id,
        selectedIndex: 3,
        timeSpentSeconds: 45,
      });

    expect(autosaveRes.status, autosaveRes.text).toBe(200);

    // Other student tries to autosave against this attempt -> 403 Forbidden
    const unauthAutosave = await request(app)
      .post(`/api/v1/attempts/${attemptId}/autosave`)
      .set('Authorization', `Bearer ${ids.otherStudent}`)
      .send({
        questionId: q1Id,
        selectedIndex: 0,
      });

    expect(unauthAutosave.status).toBe(403);
  });

  // ── 4. Result Visibility Before Submission ─────────────────────────────

  it('hides test result while attempt is still in progress', async () => {
    const res = await request(app)
      .get(`/api/v1/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${ids.student}`);

    expect(res.status).toBe(403);
  });

  // ── 5. Server-Side Atomic Grading & Duplicate Submit ───────────────────

  it('atomically grades answers on submit and blocks duplicate submissions', async () => {
    // Student submits test (Q1: index 3 [correct], Q2: index 0 [wrong])
    const submitRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${ids.student}`)
      .send({
        answers: [
          { questionId: q1Id, selectedIndex: 3, timeSpentSeconds: 60 },
          { questionId: q2Id, selectedIndex: 0, timeSpentSeconds: 40 },
        ],
        timeSpentSeconds: 100,
      });

    expect(submitRes.status, submitRes.text).toBe(200);
    expect(responseValue(submitRes, 'data.score')).toBe(10);
    expect(responseValue(submitRes, 'data.totalMarks')).toBe(20);
    expect(responseValue(submitRes, 'data.isPassed')).toBe(true);
    expect(responseValue(submitRes, 'data.status')).toBe('evaluated');

    // Duplicate submit protection
    const duplicateRes = await request(app)
      .post(`/api/v1/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${ids.student}`)
      .send({ answers: [] });

    expect(duplicateRes.status).toBe(409);
  });

  // ── 6. Result Visibility After Submission ──────────────────────────────

  it('surfaces full evaluation details to student after submission', async () => {
    const res = await request(app)
      .get(`/api/v1/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${ids.student}`);

    expect(res.status, res.text).toBe(200);
    expect(responseValue(res, 'data.score')).toBe(10);
    expect(responseValue(res, 'data.isPassed')).toBe(true);

    const questions = responseValue(res, 'data.questions') as Array<Record<string, unknown>>;
    expect(questions).toHaveLength(2);
    // Question 1 was correct (3)
    const q1Result = questions.find((q) => q.questionId === q1Id);
    expect(q1Result?.isCorrect).toBe(true);
    expect(q1Result?.correctAnswerIndex).toBe(3);
    expect(q1Result?.explanation).toContain('409 Conflict');

    // Question 2 was incorrect (0 instead of 1)
    const q2Result = questions.find((q) => q.questionId === q2Id);
    expect(q2Result?.isCorrect).toBe(false);
    expect(q2Result?.correctAnswerIndex).toBe(1);

    // Other student still cannot view this student's result
    const otherRes = await request(app)
      .get(`/api/v1/attempts/${attemptId}/result`)
      .set('Authorization', `Bearer ${ids.otherStudent}`);
    expect(otherRes.status).toBe(403);
  });

  // ── 7. Faculty Aggregate Analytics ─────────────────────────────────────

  it('allows faculty to inspect aggregate analytics for the test', async () => {
    const res = await request(app)
      .get(`/api/v1/tests/${testId}/analytics`)
      .set('Authorization', `Bearer ${ids.faculty}`);

    expect(res.status, res.text).toBe(200);
    expect(responseValue(res, 'data.totalAttempts')).toBe(1);
    expect(responseValue(res, 'data.averageScore')).toBe(10);
    expect(responseValue(res, 'data.passRatePercentage')).toBe(100);

    const questionAccuracy = responseValue(res, 'data.questionAccuracy') as Array<Record<string, unknown>>;
    expect(questionAccuracy).toHaveLength(2);
  });

  // ── 8. Mock Interviews ─────────────────────────────────────────────────

  it('supports AI mock interview scheduling and text answer evaluation', async () => {
    // Schedule AI mock interview
    const scheduleRes = await request(app)
      .post('/api/v1/mock-interviews')
      .set('Authorization', `Bearer ${ids.student}`)
      .send({
        type: 'technical',
        interviewerType: 'ai',
        targetRole: 'Senior Backend Engineer',
      });

    expect(scheduleRes.status, scheduleRes.text).toBe(201);
    interviewId = String(responseValue(scheduleRes, 'data.id'));
    expect(responseValue(scheduleRes, 'data.targetRole')).toBe('Senior Backend Engineer');

    const questions = responseValue(scheduleRes, 'data.questions') as Array<Record<string, unknown>>;
    expect(questions.length).toBeGreaterThanOrEqual(4);

    // Submit text answers
    const submitRes = await request(app)
      .post(`/api/v1/mock-interviews/${interviewId}/submit`)
      .set('Authorization', `Bearer ${ids.student}`)
      .send({
        answers: [
          {
            questionId: String(questions[0].id),
            questionText: String(questions[0].questionText),
            answerText: 'I have 3 years of experience building Node.js microservices and optimizing PostgreSQL queries.',
          },
        ],
      });

    expect(submitRes.status, submitRes.text).toBe(200);
    expect(responseValue(submitRes, 'data.status')).toBe('completed');
    expect(responseValue(submitRes, 'data.overallScore')).toBeGreaterThan(0);
    expect(responseValue(submitRes, 'data.overallScore')).toBeLessThanOrEqual(100);
    expect(responseValue(submitRes, 'data.feedback.strengths')).toBeTruthy();
    expect(responseValue(submitRes, 'data.feedback.improvements')).toBeTruthy();
  });
  it('applies catalog pagination to the database query', async () => {
    const [extraTest] = await db.insert(schema.mockTests).values({
      title: 'Pagination regression test', category: 'technical', durationMinutes: 10,
      totalMarks: 10, passingMarks: 5, createdBy: ids.faculty, isActive: true,
    }).returning();
    if (!extraTest) throw new Error('Test fixture was not inserted');
    try {
      const first = await request(app).get('/api/v1/tests?page=1&pageSize=1')
        .set('Authorization', `Bearer ${ids.faculty}`);
      const second = await request(app).get('/api/v1/tests?page=2&pageSize=1')
        .set('Authorization', `Bearer ${ids.faculty}`);
      expect(first.status, first.text).toBe(200);
      expect(second.status, second.text).toBe(200);
      const firstItems = responseValue(first, 'data') as Array<{ id: string }>;
      const secondItems = responseValue(second, 'data') as Array<{ id: string }>;
      expect(firstItems).toHaveLength(1);
      expect(secondItems).toHaveLength(1);
      expect(firstItems[0]?.id).not.toBe(secondItems[0]?.id);
      expect(responseValue(second, 'meta.page')).toBe(2);
      expect(responseValue(second, 'meta.pageSize')).toBe(1);
    } finally {
      await db.delete(schema.mockTests).where(eq(schema.mockTests.id, extraTest.id));
    }
  });

  it('rejects malformed catalog filters and pagination', async () => {
    for (const query of ['page=invalid', 'pageSize=1000', 'category=unknown', 'status=unknown', 'search[nested]=value']) {
      const res = await request(app).get(`/api/v1/tests?${query}`)
        .set('Authorization', `Bearer ${ids.faculty}`);
      expect(res.status, res.text).toBe(422);
    }
  });
});
