import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { db, schema } from '@career-portal/db';
import type { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createApp } from '@/app';
import { OpportunityExtractionService } from '@/modules/opportunities/opportunity-extraction.service';
import { responseValue } from '@/test/response-value';

const context = vi.hoisted(() => ({ client: null as PGlite | null }));
vi.mock('@career-portal/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const schema = await import('../../../../packages/db/src/schema');
  context.client = new PGlite();
  return { db: drizzle(context.client, { schema }), schema };
});

describe('Phase 4 ingestion and review with an isolated PostgreSQL engine', () => {
  let draftId = '';
  const extracted = {
    title: 'Platform Engineer', companyName: 'Phase Four Company', type: 'job' as const,
    description: 'Build reliable services', workMode: 'remote' as const, location: null,
    salaryMin: 100000, salaryMax: 200000, skills: ['TypeScript'],
    eligibility: { minCgpa: 7, departmentCodes: ['CSE'], allowedBatches: [2027], description: null },
    applicationDeadline: '2099-01-01T00:00:00.000Z', applyUrl: 'https://example.test/apply',
    applicationEmail: 'jobs@example.test', confidenceScore: 90,
  };
  it('keeps extraction private and preserves reviewed contact and work-mode edits', async () => {
    const spy = vi.spyOn(OpportunityExtractionService.prototype, 'extract').mockResolvedValue(extracted);
    const res = await request(app).post('/api/v1/opportunity-drafts/ingest').set('Authorization', `Bearer ${ids.faculty}`).send({ sourceType: 'text', content: 'A unique platform engineer position' });
    expect(res.status, res.text).toBe(201);
    draftId = String(responseValue(res, 'data.id'));
    expect(responseValue(res, 'data.workMode')).toBe('remote');
    expect(responseValue(res, 'data.resultingOpportunityId')).toBeNull();
    const edit = await request(app).patch(`/api/v1/opportunity-drafts/${draftId}`).set('Authorization', `Bearer ${ids.faculty}`).send({ workMode: 'hybrid', applyUrl: 'https://example.test/new', applicationEmail: null });
    expect(edit.status, edit.text).toBe(200);
    expect(responseValue(edit, 'data.workMode')).toBe('hybrid');
    expect(responseValue(edit, 'data.applyUrl')).toBe('https://example.test/new');
    expect(responseValue(edit, 'data.applicationEmail')).toBeNull();
    spy.mockRestore();
  });
  it('rolls back every approval write when a skill reference is invalid', async () => {
    const res = await request(app).post(`/api/v1/opportunity-drafts/${draftId}/approve`).set('Authorization', `Bearer ${ids.faculty}`).send({ skills: [{ skillId: randomUUID(), isRequired: true }] });
    expect(res.status).toBe(422);
    const draft = await db.query.opportunityDrafts.findFirst({ where: eq(schema.opportunityDrafts.id, draftId) });
    expect(draft?.status).toBe('pending_review');
    expect(await db.query.opportunities.findFirst({ where: eq(schema.opportunities.sourceDraftId, draftId) })).toBeUndefined();
  });
  it('publishes reviewed fields, resolves skills and eligibility, and rejects repeat approval', async () => {
    const res = await request(app).post(`/api/v1/opportunity-drafts/${draftId}/approve`).set('Authorization', `Bearer ${ids.faculty}`).send({ publishImmediately: true });
    expect(res.status, res.text).toBe(200);
    const opportunity = await db.query.opportunities.findFirst({ where: eq(schema.opportunities.sourceDraftId, draftId), with: { eligibility: true, opportunitySkills: true } });
    expect(opportunity?.workMode).toBe('hybrid');
    expect(opportunity?.applyUrl).toBe('https://example.test/new');
    expect(opportunity?.eligibility[0]?.departmentId).toBe(ids.department);
    expect(opportunity?.eligibility[0]?.batchId).toBe(ids.batch);
    expect(Number(opportunity?.eligibility[0]?.minCgpa)).toBe(7);
    expect(opportunity?.opportunitySkills).toHaveLength(1);
    const again = await request(app).post(`/api/v1/opportunity-drafts/${draftId}/approve`).set('Authorization', `Bearer ${ids.faculty}`).send({});
    expect(again.status).toBe(422);
  });
  it('retains failed runs in the queue and can retry the same draft', async () => {
    const spy = vi.spyOn(OpportunityExtractionService.prototype, 'extract').mockRejectedValueOnce(new Error('Simulated extraction outage')).mockResolvedValue({ ...extracted, title: 'Retry Engineer' });
    const ingest = await request(app).post('/api/v1/opportunity-drafts/ingest').set('Authorization', `Bearer ${ids.faculty}`).send({ sourceType: 'text', content: 'Unique retry source' });
    expect(ingest.status).toBe(500);
    const failed = await db.query.opportunityDrafts.findFirst({ where: eq(schema.opportunityDrafts.status, 'needs_correction'), with: { extractionRun: true } });
    expect(failed?.extractionRun.status).toBe('failed');
    if (!failed) throw new Error('Failed draft missing');
    const retry = await request(app).post(`/api/v1/opportunity-drafts/${failed.id}/retry`).set('Authorization', `Bearer ${ids.faculty}`).send({});
    expect(retry.status, retry.text).toBe(200);
    expect(responseValue(retry, 'data.extractionRun.status')).toBe('completed');
    expect(responseValue(retry, 'data.title')).toBe('Retry Engineer');
    spy.mockRestore();
  });
});
vi.mock('@/infrastructure/redis', () => ({
  redis: { ping: vi.fn().mockResolvedValue('PONG'), del: vi.fn().mockResolvedValue(1) },
  CacheKeys: { userPermissions: (id: string) => `user:${id}:permissions` },
}));
vi.mock('@/infrastructure/supabase', () => ({
  supabaseAdmin: { auth: { getUser: (token: string) => Promise.resolve({
    data: { user: token === 'invalid' ? null : { id: token, email: `${token}@example.test`, user_metadata: { full_name: 'Test User' } } },
    error: null,
  }) } },
}));

const ids = { student: randomUUID(), other: randomUUID(), faculty: randomUUID(), faculty2: randomUUID(), admin: randomUUID(), department: randomUUID(), program: randomUUID(), batch: randomUUID() };
const app = createApp();
let opportunityId = '';
let resumeId = '';
let applicationId = '';

beforeAll(async () => {
  if (!context.client) throw new Error('Test database was not initialized');
  const folder = path.resolve('../../packages/db/drizzle');
  const journal = JSON.parse(await readFile(path.join(folder, 'meta/_journal.json'), 'utf8')) as { entries: { tag: string }[] };
  for (const entry of journal.entries) {
    const sql = await readFile(path.join(folder, `${entry.tag}.sql`), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) await context.client.exec(statement);
    }
  }
  for (const id of [ids.student, ids.other, ids.faculty, ids.faculty2, ids.admin]) {
    await db.insert(schema.users).values({ id, email: `${id}@example.test`, fullName: 'Test User' });
  }
  const permissionSets = {
    STUDENT: ['students.view_own_profile', 'students.edit_own_profile', 'resumes.manage_own', 'opportunities.view', 'applications.apply', 'applications.view_own'],
    PLACEMENT_FACULTY: ['opportunities.view', 'opportunities.create', 'opportunities.edit', 'opportunities.publish', 'applications.view_all', 'applications.update_status'],
    ADMIN: ['opportunities.view', 'opportunities.create', 'opportunities.edit', 'opportunities.publish', 'applications.view_all', 'applications.update_status'],
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
    const users = name === 'STUDENT' ? [ids.student, ids.other] : name === 'ADMIN' ? [ids.admin] : [ids.faculty, ids.faculty2];
    for (const userId of users) await db.insert(schema.userRoles).values({ roleId, userId });
  }
  await db.insert(schema.departments).values({ id: ids.department, name: 'Computer Science', code: 'CSE' });
  await db.insert(schema.academicPrograms).values({ id: ids.program, departmentId: ids.department, name: 'B.Tech', degreeLevel: 'UG', durationYears: 4 });
  await db.insert(schema.batches).values({ id: ids.batch, graduationYear: 2027 });
}, 60_000);

afterAll(async () => { await context.client?.close(); });

describe('Phase 0–3 HTTP workflows with an isolated PostgreSQL engine', () => {
  it('reports healthy database and cache; rejects missing authentication', async () => {
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
    expect((await request(app).get('/api/v1/opportunities')).status).toBe(401);
  });

  it('creates and reads a student profile', async () => {
    const res = await request(app).put('/api/v1/students/me').set('Authorization', `Bearer ${ids.student}`).send({
      rollNumber: 'TEST001', departmentId: ids.department, programId: ids.program, batchId: ids.batch, cgpa: 8.5,
    });
    expect(res.status, res.text).toBe(200);
    expect(responseValue(res, 'data.rollNumber')).toBe('TEST001');
  });

  it('creates a resume and prevents another student reading it', async () => {
    const res = await request(app).post('/api/v1/resumes').set('Authorization', `Bearer ${ids.student}`).send({
      title: 'Test resume', content: { fullName: 'Test Student', email: 'student@example.test', summary: 'Software engineer', education: [], experience: [], skills: ['TypeScript'], projects: [], certifications: [], achievements: [] },
    });
    expect(res.status, res.text).toBe(201);
    resumeId = String(responseValue(res, 'data.id'));
    expect((await request(app).get(`/api/v1/resumes/${resumeId}`).set('Authorization', `Bearer ${ids.other}`)).status).toBe(403);
  });

  it('rejects a program from a different department without changing the profile', async () => {
    const departmentId = randomUUID();
    await db.insert(schema.departments).values({ id: departmentId, name: 'Mechanical', code: 'ME' });
    const res = await request(app).put('/api/v1/students/me').set('Authorization', `Bearer ${ids.student}`).send({ departmentId });
    expect(res.status, res.text).toBe(422);
    const profile = await db.query.studentProfiles.findFirst({ where: eq(schema.studentProfiles.userId, ids.student) });
    expect(profile?.departmentId).toBe(ids.department);
  });

  it('creates a private draft; rejects editing by another faculty member', async () => {
    const res = await request(app).post('/api/v1/opportunities').set('Authorization', `Bearer ${ids.faculty}`).send({
      title: 'Software Engineer', companyName: 'Test Company', type: 'job', description: 'Build web applications',
      applicationDeadline: '2099-01-01T00:00:00.000Z', eligibility: [{ departmentId: ids.department, minCgpa: 7 }],
    });
    expect(res.status, res.text).toBe(201);
    opportunityId = String(responseValue(res, 'data.id'));
    expect((await request(app).get(`/api/v1/opportunities/${opportunityId}`).set('Authorization', `Bearer ${ids.student}`)).status).toBe(404);
    expect((await request(app).put(`/api/v1/opportunities/${opportunityId}`).set('Authorization', `Bearer ${ids.faculty2}`).send({title:'Changed'})).status).toBe(403);
  });

  it('publishes the opportunity and creates exactly one application with history', async () => {
    const publish = await request(app).patch(`/api/v1/opportunities/${opportunityId}/status`).set('Authorization', `Bearer ${ids.faculty}`).send({ status: 'published' });
    expect(publish.status, publish.text).toBe(200);
    const apply = () => request(app).post('/api/v1/applications').set('Authorization', `Bearer ${ids.student}`).send({ opportunityId, resumeId });
    const res = await apply();
    expect(res.status, res.text).toBe(201);
    applicationId = String(responseValue(res, 'data.id'));
    expect(responseValue(res, 'data.statusHistory.0.status')).toBe('applied');
    expect((await apply()).status).toBe(409);
  });

  it('protects application data and rejects unauthorized status changes', async () => {
    expect((await request(app).get(`/api/v1/applications/${applicationId}`).set('Authorization', `Bearer ${ids.other}`)).status).toBe(403);
    expect((await request(app).patch(`/api/v1/applications/${applicationId}/status`).set('Authorization', `Bearer ${ids.student}`).send({ status: 'selected' })).status).toBe(403);
    expect((await request(app).patch(`/api/v1/applications/${applicationId}/status`).set('Authorization', `Bearer ${ids.faculty2}`).send({ status: 'selected' })).status).toBe(403);
  });

  it('validates compensation and deadlines and rolls back an invalid opportunity edit', async () => {
    const edit = (payload: object) => request(app).put(`/api/v1/opportunities/${opportunityId}`).set('Authorization', `Bearer ${ids.faculty}`).send(payload);
    expect((await edit({ salaryMin: 200, salaryMax: 100 })).status).toBe(422);
    expect((await edit({ applicationDeadline: '2000-01-01T00:00:00.000Z' })).status).toBe(422);
    expect((await edit({ title: 'Must roll back', skills: [{ skillId: randomUUID(), isRequired: true }] })).status).toBe(422);
    const opportunity = await db.query.opportunities.findFirst({ where: eq(schema.opportunities.id, opportunityId) });
    expect(opportunity?.title).toBe('Software Engineer');
  });

  it('records faculty review and student withdrawal, then prevents reopening', async () => {
    const review = await request(app).patch(`/api/v1/applications/${applicationId}/status`).set('Authorization', `Bearer ${ids.faculty}`).send({ status: 'under_review' });
    expect(review.status, review.text).toBe(200);
    const withdraw = await request(app).delete(`/api/v1/applications/${applicationId}`).set('Authorization', `Bearer ${ids.student}`);
    expect(withdraw.status, withdraw.text).toBe(200);
    expect(responseValue(withdraw, 'data.statusHistory.length')).toBe(3);
    expect((await request(app).patch(`/api/v1/applications/${applicationId}/status`).set('Authorization', `Bearer ${ids.faculty}`).send({ status: 'shortlisted' })).status).toBe(422);
  });

  it('validates query values and prevents deleting application history', async () => {
    expect((await request(app).get('/api/v1/opportunities?eligibleOnly=false').set('Authorization', `Bearer ${ids.student}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/opportunities?eligibleOnly=invalid').set('Authorization', `Bearer ${ids.student}`)).status).toBe(422);
    await request(app).patch(`/api/v1/opportunities/${opportunityId}/status`).set('Authorization', `Bearer ${ids.faculty}`).send({status:'closed'});
    expect((await request(app).delete(`/api/v1/opportunities/${opportunityId}`).set('Authorization', `Bearer ${ids.faculty}`)).status).toBe(422);
  });

  it('blocks a disabled account immediately', async () => {
    await db.update(schema.users).set({ isActive: false }).where(eq(schema.users.id, ids.student));
    expect((await request(app).get('/api/v1/students/me').set('Authorization', `Bearer ${ids.student}`)).status).toBe(401);
  });
});
