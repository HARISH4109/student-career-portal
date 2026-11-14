import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { db, schema } from '@career-portal/db';
import type { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
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
          data: { user: { id: token, email: `${token}@example.test`, user_metadata: {} } },
          error: null,
        }),
    },
  },
}));

describe('Academic Programs and Streams CRUD Integration Tests (Admin-Only Management)', () => {
  const app = createApp();

  const adminId = randomUUID();
  const facultyId = randomUUID();
  const studentId = randomUUID();

  const cseDeptId = randomUUID();
  const btechProgramId = randomUUID();

  const auth = (id: string): { Authorization: string } => ({ Authorization: `Bearer ${id}` });

  beforeAll(async () => {
    if (!context.client) throw new Error('Missing database client');

    const folder = fs.existsSync(path.resolve('packages/db/drizzle'))
      ? path.resolve('packages/db/drizzle')
      : path.resolve('../../packages/db/drizzle');

    const journal = JSON.parse(
      await readFile(path.join(folder, 'meta/_journal.json'), 'utf8'),
    ) as { entries: { tag: string }[] };

    for (const entry of journal.entries) {
      const migration = await readFile(path.join(folder, `${entry.tag}.sql`), 'utf8');
      for (const sql of migration.split('--> statement-breakpoint')) {
        if (sql.trim()) await context.client.exec(sql);
      }
    }

    // Seed Department
    await db.insert(schema.departments).values([
      { id: cseDeptId, name: 'Computer Science and Engineering', code: 'CSE' },
    ]);

    // Seed Program
    await db.insert(schema.academicPrograms).values([
      {
        id: btechProgramId,
        departmentId: cseDeptId,
        name: 'B.Tech Computer Science and Engineering',
        degreeLevel: 'B.Tech',
        durationYears: 4,
        isActive: true,
      },
    ]);

    // Seed Streams
    await db.insert(schema.academicStreams).values([
      {
        programId: btechProgramId,
        name: 'Artificial Intelligence & Data Science',
        code: 'AI-DS',
        isActive: true,
      },
      {
        programId: btechProgramId,
        name: 'Cyber Security',
        code: 'CSE-CS',
        isActive: true,
      },
    ]);

    // Seed Users
    await db.insert(schema.users).values([
      { id: adminId, email: 'admin@test.local', fullName: 'Admin User' },
      { id: facultyId, email: 'faculty@test.local', fullName: 'Faculty User' },
      { id: studentId, email: 'student@test.local', fullName: 'Student User' },
    ]);

    // Seed Roles
    const [adminRole] = await db.insert(schema.roles).values({ name: 'ADMIN' }).returning();
    const [facultyRole] = await db.insert(schema.roles).values({ name: 'PLACEMENT_FACULTY' }).returning();
    const [studentRole] = await db.insert(schema.roles).values({ name: 'STUDENT' }).returning();

    if (!adminRole || !facultyRole || !studentRole) {
      throw new Error('Failed to create test roles');
    }

    await db.insert(schema.userRoles).values([
      { userId: adminId, roleId: adminRole.id },
      { userId: facultyId, roleId: facultyRole.id },
      { userId: studentId, roleId: studentRole.id },
    ]);
  });

  // ── Programs CRUD Tests ──────────────────────────────────────────────────

  it('GET /api/v1/academic/programs returns programs with nested streams', async () => {
    const res = await request(app).get('/api/v1/academic/programs');
    expect(res.status).toBe(200);

    const programs = responseValue(res, 'data') as Array<{
      id: string;
      name: string;
      streams: Array<{ name: string; code: string }>;
    }>;

    expect(programs.length).toBeGreaterThan(0);
    const btech = programs.find((p) => p.id === btechProgramId);
    expect(btech).toBeDefined();
    expect(btech?.streams.length).toBe(2);
    expect(btech?.streams.map((s) => s.code)).toContain('AI-DS');
  });

  it('POST /api/v1/academic/programs creates a program when called by admin', async () => {
    const res = await request(app)
      .post('/api/v1/academic/programs')
      .set(auth(adminId))
      .send({
        name: 'Master of Computer Applications (MCA)',
        degreeLevel: 'MCA',
        durationYears: 2,
      });

    expect(res.status).toBe(201);
    expect(responseValue(res, 'data.name')).toBe('Master of Computer Applications (MCA)');
    expect(responseValue(res, 'data.degreeLevel')).toBe('MCA');
    expect(responseValue(res, 'data.durationYears')).toBe(2);
  });

  it('POST /api/v1/academic/programs returns 403 Forbidden when called by faculty', async () => {
    const res = await request(app)
      .post('/api/v1/academic/programs')
      .set(auth(facultyId))
      .send({
        name: 'Unauthorized Faculty Program',
        degreeLevel: 'M.Tech',
        durationYears: 2,
      });

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/academic/programs returns 403 Forbidden when called by a student', async () => {
    const res = await request(app)
      .post('/api/v1/academic/programs')
      .set(auth(studentId))
      .send({
        name: 'Unauthorized Student Program',
        degreeLevel: 'Diploma',
        durationYears: 1,
      });

    expect(res.status).toBe(403);
  });

  it('PUT /api/v1/academic/programs/:id updates program details when called by admin', async () => {
    const res = await request(app)
      .put(`/api/v1/academic/programs/${btechProgramId}`)
      .set(auth(adminId))
      .send({
        name: 'B.Tech Computer Science & Engineering (Updated)',
        durationYears: 4,
      });

    expect(res.status).toBe(200);
    expect(responseValue(res, 'data.name')).toBe('B.Tech Computer Science & Engineering (Updated)');
  });

  it('DELETE /api/v1/academic/programs/:id soft-deletes the program when called by admin', async () => {
    // Create a temporary program to delete
    const createRes = await request(app)
      .post('/api/v1/academic/programs')
      .set(auth(adminId))
      .send({
        name: 'Temporary Program to Delete',
        degreeLevel: 'Certificate',
        durationYears: 1,
      });

    const progId = responseValue(createRes, 'data.id') as string;

    const delRes = await request(app)
      .delete(`/api/v1/academic/programs/${progId}`)
      .set(auth(adminId));

    expect(delRes.status).toBe(200);
    expect(responseValue(delRes, 'data.isActive')).toBe(false);

    // Verify program no longer appears in active programs list
    const listRes = await request(app).get('/api/v1/academic/programs');
    const progs = responseValue(listRes, 'data') as Array<{ id: string }>;
    expect(progs.find((p) => p.id === progId)).toBeUndefined();
  });

  // ── Streams CRUD Tests ───────────────────────────────────────────────────

  it('GET /api/v1/academic/streams returns active streams, filterable by programId', async () => {
    const res = await request(app)
      .get(`/api/v1/academic/streams?programId=${btechProgramId}`);

    expect(res.status).toBe(200);
    const streams = responseValue(res, 'data') as Array<{ name: string; code: string }>;
    expect(streams.length).toBe(2);
    expect(streams.map((s) => s.code)).toContain('AI-DS');
  });

  it('POST /api/v1/academic/streams creates a new stream when called by admin', async () => {
    const res = await request(app)
      .post('/api/v1/academic/streams')
      .set(auth(adminId))
      .send({
        programId: btechProgramId,
        name: 'Data Analytics',
        code: 'DA',
      });

    expect(res.status).toBe(201);
    expect(responseValue(res, 'data.name')).toBe('Data Analytics');
    expect(responseValue(res, 'data.code')).toBe('DA');
    expect(responseValue(res, 'data.programId')).toBe(btechProgramId);
  });

  it('POST /api/v1/academic/streams returns 403 Forbidden for faculty', async () => {
    const res = await request(app)
      .post('/api/v1/academic/streams')
      .set(auth(facultyId))
      .send({
        programId: btechProgramId,
        name: 'Faculty Created Stream',
        code: 'FCS',
      });

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/academic/streams returns 403 Forbidden for students', async () => {
    const res = await request(app)
      .post('/api/v1/academic/streams')
      .set(auth(studentId))
      .send({
        programId: btechProgramId,
        name: 'Student Stream',
        code: 'SS',
      });

    expect(res.status).toBe(403);
  });

  it('PUT /api/v1/academic/streams/:id updates an existing stream when called by admin', async () => {
    // List streams to get the ID of AI-DS
    const listRes = await request(app)
      .get(`/api/v1/academic/streams?programId=${btechProgramId}`);
    const streams = responseValue(listRes, 'data') as Array<{ id: string; code: string }>;
    const aids = streams.find((s) => s.code === 'AI-DS');
    expect(aids).toBeDefined();

    const aidsId = aids ? aids.id : '';
    const updateRes = await request(app)
      .put(`/api/v1/academic/streams/${aidsId}`)
      .set(auth(adminId))
      .send({
        name: 'Artificial Intelligence and Data Science (Renamed)',
      });

    expect(updateRes.status).toBe(200);
    expect(responseValue(updateRes, 'data.name')).toBe(
      'Artificial Intelligence and Data Science (Renamed)',
    );
  });

  it('DELETE /api/v1/academic/streams/:id soft-deletes the stream when called by admin', async () => {
    // Create a temporary stream to delete
    const createRes = await request(app)
      .post('/api/v1/academic/streams')
      .set(auth(adminId))
      .send({
        programId: btechProgramId,
        name: 'Temporary Stream to Delete',
        code: 'TEMP',
      });

    const streamId = responseValue(createRes, 'data.id') as string;

    const delRes = await request(app)
      .delete(`/api/v1/academic/streams/${streamId}`)
      .set(auth(adminId));

    expect(delRes.status).toBe(200);
    expect(responseValue(delRes, 'data.isActive')).toBe(false);

    // Verify stream no longer appears in active streams list
    const listRes = await request(app)
      .get(`/api/v1/academic/streams?programId=${btechProgramId}`);
    const streams = responseValue(listRes, 'data') as Array<{ id: string }>;
    expect(streams.find((s) => s.id === streamId)).toBeUndefined();
  });
});
