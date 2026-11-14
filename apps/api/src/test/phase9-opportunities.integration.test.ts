import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
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
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
    del: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
  },
  CacheKeys: { userPermissions: (id: string): string => `user:${id}:permissions` },
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
          data: {
            user: {
              id: token,
              email: `${token}@univ.test`,
              user_metadata: { full_name: `User ${token}` },
            },
          },
          error: null,
        }),
    },
  },
}));

describe('Phase 9 — Opportunity Lifecycle Integration Tests', () => {
  const app = createApp();

  const facultyUserId = randomUUID();
  const studentUserId = randomUUID();
  const departmentId = randomUUID();
  const programId = randomUUID();
  const batchId = randomUUID();

  const auth = (id: string): { Authorization: string } => ({ Authorization: `Bearer ${id}` });

  let createdOppId = '';

  beforeAll(async () => {
    if (!context.client) throw new Error('Database client uninitialized');

    const folder = fs.existsSync(path.resolve('packages/db/drizzle'))
      ? path.resolve('packages/db/drizzle')
      : path.resolve('../../packages/db/drizzle');

    const journal = JSON.parse(
      await readFile(path.join(folder, 'meta/_journal.json'), 'utf8'),
    ) as { entries: { tag: string }[] };

    for (const entry of journal.entries) {
      const sql = await readFile(path.join(folder, `${entry.tag}.sql`), 'utf8');
      for (const statement of sql.split('--> statement-breakpoint')) {
        if (statement.trim()) await context.client.exec(statement);
      }
    }

    // 1. Seed users
    await db.insert(schema.users).values([
      { id: facultyUserId, email: 'faculty@univ.test', fullName: 'Prof. Anderson', isActive: true },
      { id: studentUserId, email: 'student@univ.test', fullName: 'John Doe', isActive: true },
    ]);

    // 2. Seed roles & permissions
    const facultyPermissions = [
      'opportunities.view',
      'opportunities.create',
      'opportunities.edit',
      'opportunities.publish',
    ];
    const studentPermissions = ['opportunities.view'];

    for (const key of [...facultyPermissions, ...studentPermissions]) {
      await db.insert(schema.permissions).values({ key }).onConflictDoNothing();
    }

    const [facultyRole] = await db
      .insert(schema.roles)
      .values({ name: 'PLACEMENT_FACULTY' })
      .returning();
    const [studentRole] = await db.insert(schema.roles).values({ name: 'STUDENT' }).returning();

    if (facultyRole) {
      for (const key of facultyPermissions) {
        const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
        if (p) await db.insert(schema.rolePermissions).values({ roleId: facultyRole.id, permissionId: p.id });
      }
      await db.insert(schema.userRoles).values([{ userId: facultyUserId, roleId: facultyRole.id }]);
    }

    if (studentRole) {
      for (const key of studentPermissions) {
        const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
        if (p) await db.insert(schema.rolePermissions).values({ roleId: studentRole.id, permissionId: p.id });
      }
      await db.insert(schema.userRoles).values([{ userId: studentUserId, roleId: studentRole.id }]);
    }

    // 3. Seed academic structure
    await db.insert(schema.departments).values({
      id: departmentId,
      name: 'Computer Science and Engineering',
      code: 'CSE',
    });
    await db.insert(schema.academicPrograms).values({
      id: programId,
      departmentId,
      name: 'B.Tech CSE',
      degreeLevel: 'Bachelors',
      durationYears: 4,
    });
    await db.insert(schema.batches).values({
      id: batchId,
      graduationYear: 2026,
    });

    // 4. Seed student profile
    await db.insert(schema.studentProfiles).values({
      userId: studentUserId,
      rollNumber: '2026CSE001',
      departmentId,
      programId,
      batchId,
      cgpa: '8.75',
    });
  });

  afterAll(async () => {
    await context.client?.close();
  });

  // ── Step 1: Create Draft ──────────────────────────────────────────────────

  it('creates an opportunity draft and verifies persistence in PGlite DB', async () => {
    const futureDeadline = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/v1/opportunities')
      .set(auth(facultyUserId))
      .send({
        companyName: 'Stripe Global',
        title: 'Backend Infrastructure Engineer',
        type: 'job',
        description: 'Design, build, and operate core distributed payment APIs in Go and TypeScript.',
        workMode: 'remote',
        location: 'Remote, India',
        salaryMin: 1800000,
        salaryMax: 2600000,
        applicationDeadline: futureDeadline,
        eligibility: [
          {
            departmentId,
            programId,
            batchId,
            minCgpa: 8.0,
          },
        ],
        skills: [],
      });

    expect(res.status).toBe(201);
    expect(responseValue(res, 'success')).toBe(true);

    createdOppId = String(responseValue(res, 'data.id'));
    expect(createdOppId).toBeDefined();
    expect(responseValue(res, 'data.status')).toBe('draft');
    expect(responseValue(res, 'data.title')).toBe('Backend Infrastructure Engineer');
    expect(responseValue(res, 'data.company.name')).toBe('Stripe Global');

    // Direct DB verification
    const oppInDb = await db.query.opportunities.findFirst({
      where: eq(schema.opportunities.id, createdOppId),
      with: { company: true, eligibility: true },
    });

    expect(oppInDb).toBeDefined();
    expect(oppInDb?.title).toBe('Backend Infrastructure Engineer');
    expect(oppInDb?.status).toBe('draft');
    expect(oppInDb?.company.name).toBe('Stripe Global');
    expect(oppInDb?.eligibility).toHaveLength(1);
    expect(oppInDb?.eligibility[0]?.departmentId).toBe(departmentId);
    expect(Number(oppInDb?.eligibility[0]?.minCgpa)).toBe(8.0);
  });

  // ── Step 2: Verify Draft Is Hidden from Students ─────────────────────────

  it('ensures students cannot view draft opportunities in listing or detail', async () => {
    // Detail lookup by ID returns 404 for students on draft
    const detailRes = await request(app)
      .get(`/api/v1/opportunities/${createdOppId}`)
      .set(auth(studentUserId));

    expect(detailRes.status).toBe(404);

    // List lookup does not include the draft
    const listRes = await request(app)
      .get('/api/v1/opportunities')
      .set(auth(studentUserId));

    expect(listRes.status).toBe(200);
    const opps = responseValue(listRes, 'data.opportunities') as Array<{ id: string }>;
    expect(opps.some((o) => o.id === createdOppId)).toBe(false);
  });

  // ── Step 3: Update Draft ─────────────────────────────────────────────────

  it('updates the opportunity draft and verifies updated fields in DB', async () => {
    const res = await request(app)
      .put(`/api/v1/opportunities/${createdOppId}`)
      .set(auth(facultyUserId))
      .send({
        title: 'Senior Backend Infrastructure Engineer',
        salaryMin: 2200000,
        salaryMax: 3000000,
        workMode: 'hybrid',
        location: 'Bengaluru / Remote',
      });

    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data.title')).toBe('Senior Backend Infrastructure Engineer');
    expect(responseValue(res, 'data.salaryMin')).toBe(2200000);
    expect(responseValue(res, 'data.salaryMax')).toBe(3000000);
    expect(responseValue(res, 'data.workMode')).toBe('hybrid');

    // Direct DB verification
    const oppInDb = await db.query.opportunities.findFirst({
      where: eq(schema.opportunities.id, createdOppId),
    });

    expect(oppInDb?.title).toBe('Senior Backend Infrastructure Engineer');
    expect(Number(oppInDb?.salaryMin)).toBe(2200000);
    expect(oppInDb?.workMode).toBe('hybrid');
  });

  // ── Step 4: Publish Opportunity ──────────────────────────────────────────

  it('publishes the opportunity and verifies status transition to "published"', async () => {
    const res = await request(app)
      .patch(`/api/v1/opportunities/${createdOppId}/status`)
      .set(auth(facultyUserId))
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data.status')).toBe('published');

    // Direct DB verification
    const oppInDb = await db.query.opportunities.findFirst({
      where: eq(schema.opportunities.id, createdOppId),
    });

    expect(oppInDb?.status).toBe('published');
  });

  // ── Step 5: Student Views Published Opportunities ────────────────────────

  it('allows students to discover and inspect published opportunities with eligibility', async () => {
    // 1. Student detail view
    const detailRes = await request(app)
      .get(`/api/v1/opportunities/${createdOppId}`)
      .set(auth(studentUserId));

    expect(detailRes.status).toBe(200);
    expect(responseValue(detailRes, 'success')).toBe(true);
    expect(responseValue(detailRes, 'data.id')).toBe(createdOppId);
    expect(responseValue(detailRes, 'data.status')).toBe('published');
    expect(responseValue(detailRes, 'data.title')).toBe('Senior Backend Infrastructure Engineer');
    // Student has 8.75 CGPA, required is 8.0 -> isEligible should be true
    expect(responseValue(detailRes, 'data.isEligible')).toBe(true);

    // 2. Student catalog list view
    const listRes = await request(app)
      .get('/api/v1/opportunities')
      .set(auth(studentUserId));

    expect(listRes.status).toBe(200);
    const opps = responseValue(listRes, 'data.opportunities') as Array<{
      id: string;
      status: string;
      isEligible: boolean;
    }>;

    const matched = opps.find((o) => o.id === createdOppId);
    expect(matched).toBeDefined();
    expect(matched?.status).toBe('published');
    expect(matched?.isEligible).toBe(true);
  });
});
