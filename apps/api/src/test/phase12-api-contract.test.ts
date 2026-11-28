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

const context = vi.hoisted(() => ({ client: null as PGlite | null }));

vi.mock('@career-portal/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const schemaModule = await import('../../../../packages/db/src/schema');
  context.client = new PGlite();
  return { db: drizzle(context.client, { schema: schemaModule }), schema: schemaModule };
});

vi.mock('../../../../packages/db/src/client', async () => {
  const { db: dbInstance } = await import('@career-portal/db');
  return { db: dbInstance };
});

vi.mock('@/infrastructure/redis', () => ({
  redis: {
    ping: vi.fn().mockResolvedValue('PONG'),
    del: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
  },
  CacheKeys: {
    userPermissions: (id: string): string => `user:${id}:permissions`,
    userSession: (id: string): string => `user:${id}:session`,
  },
  PERMISSIONS_CACHE_TTL: 300,
}));

vi.mock('@/infrastructure/supabase', () => ({
  createAuthClient: () => ({ auth: { signInWithPassword: vi.fn(), refreshSession: vi.fn() } }),
  supabaseAdmin: {
    auth: {
      getUser: (token: string) =>
        Promise.resolve({
          data: {
            user:
              token === 'invalid-token'
                ? null
                : {
                    id: token,
                    email: `${token}@univ.test`,
                    user_metadata: { full_name: `User ${token}` },
                  },
          },
          error: token === 'invalid-token' ? { message: 'Invalid token' } : null,
        }),
      admin: {
        createUser: vi.fn(),
        signOut: vi.fn(),
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  },
}));

describe('Phase 12 — API Contract & Integration Specification', () => {
  const app = createApp();

  const adminUserId = randomUUID();
  const facultyUserId = randomUUID();
  const studentUserId = randomUUID();
  const targetUserId = randomUUID();
  const departmentId = randomUUID();
  const programId = randomUUID();
  const batchId = randomUUID();

  const auth = (id: string): { Authorization: string } => ({ Authorization: `Bearer ${id}` });

  let createdResumeId = '';
  let createdOpportunityId = '';
  let createdApplicationId = '';
  let createdNoticeId = '';

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

    await db.insert(schema.departments).values({ id: departmentId, name: 'Computer Science', code: 'CSE' });
    await db.insert(schema.academicPrograms).values({
      id: programId,
      departmentId,
      name: 'B.Tech',
      degreeLevel: 'Bachelors',
      durationYears: 4,
    });
    await db.insert(schema.batches).values({ id: batchId, label: '2026', graduationYear: 2026 });

    await db.insert(schema.users).values([
      { id: adminUserId, email: 'admin@univ.test', fullName: 'Admin User', isActive: true },
      { id: facultyUserId, email: 'faculty@univ.test', fullName: 'Faculty User', isActive: true },
      { id: studentUserId, email: 'student@univ.test', fullName: 'Student User', isActive: true },
      { id: targetUserId, email: 'target@univ.test', fullName: 'Target User', isActive: true },
    ]);

    await db.insert(schema.studentProfiles).values({
      userId: studentUserId,
      rollNumber: 'CSE2026001',
      departmentId,
      programId,
      batchId,
      cgpa: '8.50',
    });

    const allPermissions = [
      'admin.manage_users',
      'admin.manage_roles',
      'students.view_own_profile',
      'students.edit_own_profile',
      'resumes.manage_own',
      'opportunities.view',
      'opportunities.create',
      'opportunities.edit',
      'opportunities.publish',
      'applications.apply',
      'applications.view_own',
      'applications.update_status',
      'skill_gap.analyze_own',
      'notices.view',
      'notices.publish',
    ];

    for (const key of allPermissions) {
      await db.insert(schema.permissions).values({ key }).onConflictDoNothing();
    }

    const [adminRole] = await db.insert(schema.roles).values({ name: 'ADMIN' }).returning();
    const [facultyRole] = await db.insert(schema.roles).values({ name: 'PLACEMENT_FACULTY' }).returning();
    const [studentRole] = await db.insert(schema.roles).values({ name: 'STUDENT' }).returning();

    if (!adminRole || !facultyRole || !studentRole) {
      throw new Error('Failed to seed roles');
    }

    for (const key of ['admin.manage_users', 'admin.manage_roles']) {
      const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
      if (p) await db.insert(schema.rolePermissions).values({ roleId: adminRole.id, permissionId: p.id }).onConflictDoNothing();
    }
    for (const key of [
      'opportunities.view',
      'opportunities.create',
      'opportunities.edit',
      'opportunities.publish',
      'applications.update_status',
      'notices.view',
      'notices.publish',
    ]) {
      const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
      if (p) await db.insert(schema.rolePermissions).values({ roleId: facultyRole.id, permissionId: p.id }).onConflictDoNothing();
    }
    for (const key of [
      'students.view_own_profile',
      'students.edit_own_profile',
      'resumes.manage_own',
      'opportunities.view',
      'applications.apply',
      'applications.view_own',
      'skill_gap.analyze_own',
      'notices.view',
    ]) {
      const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
      if (p) await db.insert(schema.rolePermissions).values({ roleId: studentRole.id, permissionId: p.id }).onConflictDoNothing();
    }

    await db.insert(schema.userRoles).values([
      { userId: adminUserId, roleId: adminRole.id },
      { userId: facultyUserId, roleId: facultyRole.id },
      { userId: studentUserId, roleId: studentRole.id },
      { userId: targetUserId, roleId: studentRole.id },
    ]);
  });

  afterAll(async () => {
    await context.client?.close();
  });

  describe('Envelope & Error Contracts', () => {
    it('returns standard success envelope with error: null and meta.requestId', async () => {
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Request-Id', 'phase12-trace-123');

      expect([200, 503]).toContain(res.status);
      expect(res.headers['x-request-id']).toBe('phase12-trace-123');
      expect(res.body).toMatchObject({
        success: true,
        error: null,
        meta: { requestId: 'phase12-trace-123' },
      });
      expect(res.body.data).toBeDefined();
    });

    it('returns standard 404 JSON error envelope for unmatched /api/v1 routes', async () => {
      const res = await request(app)
        .get('/api/v1/non-existent-endpoint')
        .set('X-Request-Id', 'phase12-404');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        data: null,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
        },
        meta: {
          requestId: 'phase12-404',
        },
      });
    });

    it('returns standard 401 JSON error envelope when unauthenticated', async () => {
      const res = await request(app).patch('/api/v1/users/me').send({ fullName: 'Test' });
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.data).toBeNull();
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(typeof res.body.meta.requestId).toBe('string');
    });

    it('returns standard 403 JSON error envelope when lacking permission', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set(auth(studentUserId))
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.data).toBeNull();
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 422 VALIDATION_ERROR when pagination pageSize exceeds max (100)', async () => {
      const res = await request(app)
        .get('/api/v1/resumes?page=1&pageSize=101')
        .set(auth(studentUserId));

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.data).toBeNull();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns standard 429 RATE_LIMITED JSON error envelope with meta.requestId when rate limit exceeded', async () => {
      const { env } = await import('@/config/env');
      const prevLimit = env.RATE_LIMIT_MAX_REQUESTS;
      env.RATE_LIMIT_MAX_REQUESTS = 2;
      const limitedApp = createApp();
      env.RATE_LIMIT_MAX_REQUESTS = prevLimit;

      await request(limitedApp).get('/api/v1/openapi.json');
      await request(limitedApp).get('/api/v1/openapi.json');
      const res = await request(limitedApp)
        .get('/api/v1/openapi.json')
        .set('X-Request-Id', 'phase12-rate-limit-429');

      expect(res.status).toBe(429);
      expect(res.headers['x-request-id']).toBe('phase12-rate-limit-429');
      expect(res.body).toEqual({
        success: false,
        data: null,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
        },
        meta: {
          requestId: 'phase12-rate-limit-429',
        },
      });
    });
  });

  describe('OpenAPI Documentation', () => {
    it('serves valid OpenAPI 3.1.0 specification at GET /api/v1/openapi.json', async () => {
      const res = await request(app).get('/api/v1/openapi.json');
      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.1.0');
      expect(res.body.servers?.[0]?.url).toBe('/api/v1');

      const requiredPaths = [
        '/auth/me',
        '/users/me',
        '/students/me',
        '/students/{id}',
        '/resumes',
        '/resumes/{id}',
        '/resumes/{id}/analyze',
        '/opportunities',
        '/opportunities/{id}',
        '/opportunities/{id}/publish',
        '/opportunities/{id}/close',
        '/opportunities/{id}/applications',
        '/applications/me',
        '/applications/{id}',
        '/applications/{id}/withdraw',
        '/applications/{id}/status',
        '/extraction/sources',
        '/extraction/drafts',
        '/extraction/drafts/{id}',
        '/extraction/drafts/{id}/approve',
        '/extraction/drafts/{id}/reject',
        '/extraction/runs/{id}/retry',
        '/tests',
        '/tests/{id}',
        '/tests/{id}/start',
        '/tests/{id}/submit',
        '/attempts/{id}/result',
        '/career-paths',
        '/roadmaps',
        '/roadmaps/{id}',
        '/resources',
        '/skill-gaps/me',
        '/skill-gaps/analyze',
        '/notices',
        '/notices/{id}/publish',
        '/notifications',
        '/notifications/{id}/read',
        '/admin/users',
        '/admin/users/{id}/status',
        '/admin/audit-logs',
      ];

      for (const p of requiredPaths) {
        expect(res.body.paths).toHaveProperty(p);
      }
    });

    it('serves Swagger UI HTML at GET /api/v1/docs', async () => {
      const res = await request(app).get('/api/v1/docs');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.text).toContain('/api/v1/openapi.json');
    });
  });

  describe('Phase 12 Canonical Endpoints', () => {
    it('PATCH /api/v1/users/me updates current user profile', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set(auth(studentUserId))
        .send({ fullName: 'Student Updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Student Updated');
    });

    it('PATCH /api/v1/students/me updates student profile', async () => {
      const res = await request(app)
        .patch('/api/v1/students/me')
        .set(auth(studentUserId))
        .send({ bio: 'Aspiring Backend Engineer' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bio).toBe('Aspiring Backend Engineer');
    });

    it('POST /api/v1/resumes, GET /api/v1/resumes (paginated), PATCH /api/v1/resumes/:id', async () => {
      const createRes = await request(app)
        .post('/api/v1/resumes')
        .set(auth(studentUserId))
        .send({
          title: 'SDE Resume',
          content: {
            fullName: 'Student Updated',
            email: 'student@univ.test',
          },
        });

      expect(createRes.status).toBe(201);
      createdResumeId = createRes.body.data.id;

      const listRes = await request(app)
        .get('/api/v1/resumes?page=1&pageSize=10')
        .set(auth(studentUserId));

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.meta).toMatchObject({ page: 1, pageSize: 10, totalItems: 1, totalPages: 1 });

      const patchRes = await request(app)
        .patch(`/api/v1/resumes/${createdResumeId}`)
        .set(auth(studentUserId))
        .send({ title: 'SDE Resume v2' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.title).toBe('SDE Resume v2');
    });

    it('Opportunities & Applications canonical lifecycle (PATCH, publish, apply, withdraw, close)', async () => {
      const createOpp = await request(app)
        .post('/api/v1/opportunities')
        .set(auth(facultyUserId))
        .send({
          title: 'Backend Intern',
          companyName: 'Acme Tech',
          type: 'internship',
          description: 'Build scalable APIs.',
        });

      expect(createOpp.status).toBe(201);
      createdOpportunityId = createOpp.body.data.id;

      const patchOpp = await request(app)
        .patch(`/api/v1/opportunities/${createdOpportunityId}`)
        .set(auth(facultyUserId))
        .send({ location: 'Bengaluru' });

      expect(patchOpp.status).toBe(200);
      expect(patchOpp.body.data.location).toBe('Bengaluru');

      const publishOpp = await request(app)
        .post(`/api/v1/opportunities/${createdOpportunityId}/publish`)
        .set(auth(facultyUserId));

      expect(publishOpp.status).toBe(200);
      expect(publishOpp.body.data.status).toBe('published');

      const applyRes = await request(app)
        .post(`/api/v1/opportunities/${createdOpportunityId}/applications`)
        .set(auth(studentUserId))
        .send({ resumeId: createdResumeId });

      expect(applyRes.status).toBe(201);
      createdApplicationId = applyRes.body.data.id;

      const withdrawRes = await request(app)
        .post(`/api/v1/applications/${createdApplicationId}/withdraw`)
        .set(auth(studentUserId));

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.data.status).toBe('withdrawn');

      const closeOpp = await request(app)
        .post(`/api/v1/opportunities/${createdOpportunityId}/close`)
        .set(auth(facultyUserId));

      expect(closeOpp.status).toBe(200);
      expect(closeOpp.body.data.status).toBe('closed');
    });

    it('GET /api/v1/extraction/drafts returns paginated drafts and POST /api/v1/extraction/runs/:id/retry resolves runId', async () => {
      const res = await request(app)
        .get('/api/v1/extraction/drafts?page=1&pageSize=20')
        .set(auth(facultyUserId));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({ page: 1, pageSize: 20 });

      const [source] = await db
        .insert(schema.opportunitySources)
        .values({
          sourceType: 'text',
          rawContent: 'Hiring SDE Intern at TestCorp',
          submittedBy: facultyUserId,
          status: 'failed',
        })
        .returning();
      if (!source) throw new Error('Failed to seed source');

      const [run] = await db
        .insert(schema.aiExtractionRuns)
        .values({
          sourceId: source.id,
          status: 'failed',
          errorMessage: 'Timeout',
        })
        .returning();
      if (!run) throw new Error('Failed to seed run');

      await db.insert(schema.opportunityDrafts).values({
        extractionRunId: run.id,
        status: 'needs_correction',
        title: 'Untitled',
        companyName: 'Unknown',
        type: 'internship',
      });

      const { OpportunityExtractionService } = await import('@/modules/opportunities/opportunity-extraction.service');
      const spy = vi.spyOn(OpportunityExtractionService.prototype, 'extract').mockResolvedValueOnce({
        title: 'SDE Intern',
        companyName: 'TestCorp',
        type: 'internship',
        description: 'Build APIs',
        skills: [],
        confidenceScore: 0.9,
        fieldConfidence: {},
      });

      const retryRes = await request(app)
        .post(`/api/v1/extraction/runs/${run.id}/retry`)
        .set(auth(facultyUserId));

      spy.mockRestore();

      expect(retryRes.status).toBe(200);
      expect(retryRes.body.success).toBe(true);
      expect(retryRes.body.data.title).toBe('SDE Intern');
    });

    it('GET /api/v1/skill-gaps/me (paginated) & POST /api/v1/skill-gaps/analyze', async () => {
      const listRes = await request(app)
        .get('/api/v1/skill-gaps/me?page=1&pageSize=10')
        .set(auth(studentUserId));
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body.data)).toBe(true);
      expect(listRes.body.meta).toMatchObject({ page: 1, pageSize: 10, totalItems: 0, totalPages: 1 });

      const badPage = await request(app)
        .get('/api/v1/skill-gaps/me?page=1&pageSize=101')
        .set(auth(studentUserId));
      expect(badPage.status).toBe(422);
      expect(badPage.body.error.code).toBe('VALIDATION_ERROR');

      const badAnalyze = await request(app)
        .post('/api/v1/skill-gaps/analyze')
        .set(auth(studentUserId))
        .send({});
      expect(badAnalyze.status).toBe(422);
      expect(badAnalyze.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/notices/:id/publish publishes a notice', async () => {
      const createRes = await request(app)
        .post('/api/v1/notices')
        .set(auth(facultyUserId))
        .send({
          title: 'Placement Drive Briefing',
          content: 'Mandatory session on Friday.',
          category: 'placement',
          status: 'draft',
        });

      expect(createRes.status).toBe(201);
      createdNoticeId = createRes.body.data.id;

      const pubRes = await request(app)
        .post(`/api/v1/notices/${createdNoticeId}/publish`)
        .set(auth(facultyUserId));

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.status).toBe('published');
    });

    it('PATCH /api/v1/admin/users/:id/status activates and deactivates a user', async () => {
      const deactivateRes = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set(auth(adminUserId))
        .send({ status: 'INACTIVE' });

      expect(deactivateRes.status).toBe(200);
      expect(deactivateRes.body.data).toMatchObject({ id: targetUserId, status: 'INACTIVE', isActive: false });

      const activateRes = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set(auth(adminUserId))
        .send({ status: 'ACTIVE' });

      expect(activateRes.status).toBe(200);
      expect(activateRes.body.data).toMatchObject({ id: targetUserId, status: 'ACTIVE', isActive: true });

      const badStatus = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set(auth(adminUserId))
        .send({ status: 'UNKNOWN' });

      expect(badStatus.status).toBe(422);
      expect(badStatus.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
