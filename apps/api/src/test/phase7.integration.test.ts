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
import { cronManager } from '@/infrastructure/cron';
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

describe('Phase 7 — Notices, Notifications, and Analytics Integration Tests', () => {
  const app = createApp();

  const facultyId = randomUUID();
  const adminId = randomUUID();
  const student1Id = randomUUID();
  const student2Id = randomUUID();

  const deptAId = randomUUID();
  const deptBId = randomUUID();
  const batch2026Id = randomUUID();
  const batch2027Id = randomUUID();
  const programId = randomUUID();

  const studentProfile1Id = randomUUID();
  const studentProfile2Id = randomUUID();

  const auth = (id: string) => ({ Authorization: `Bearer ${id}` });

  let generalNoticeId = '';
  let deptANoticeId = '';
  let scheduledNoticeId = '';

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

    // 1. Seed Academic Structure
    await db.insert(schema.departments).values([
      { id: deptAId, name: 'Computer Science', code: 'CSE' },
      { id: deptBId, name: 'Electrical Engineering', code: 'EEE' },
    ]);

    await db.insert(schema.academicPrograms).values([
      { id: programId, departmentId: deptAId, name: 'B.Tech CSE', degreeLevel: 'UG', durationYears: 4 },
    ]);

    await db.insert(schema.batches).values([
      { id: batch2026Id, graduationYear: 2026 },
      { id: batch2027Id, graduationYear: 2027 },
    ]);

    // 2. Seed Users
    await db.insert(schema.users).values([
      { id: facultyId, email: 'faculty@test.local', fullName: 'Faculty User' },
      { id: adminId, email: 'admin@test.local', fullName: 'Admin User' },
      { id: student1Id, email: 'student1@test.local', fullName: 'Student One' },
      { id: student2Id, email: 'student2@test.local', fullName: 'Student Two' },
    ]);

    // 3. Seed Roles and Permissions
    const permissionsList = [
      'notices.view',
      'notices.publish',
      'notifications.view_own',
      'notifications.manage_preferences',
      'analytics.view_own',
      'analytics.view_all',
      'admin.system_config',
      'opportunities.view',
      'opportunities.create',
      'opportunities.publish',
    ];

    for (const key of permissionsList) {
      await db.insert(schema.permissions).values({ key }).onConflictDoNothing();
    }

    const [facultyRole] = await db.insert(schema.roles).values({ name: 'PLACEMENT_FACULTY' }).returning();
    const [adminRole] = await db.insert(schema.roles).values({ name: 'ADMIN' }).returning();
    const [studentRole] = await db.insert(schema.roles).values({ name: 'STUDENT' }).returning();

    // Map permissions
    for (const key of ['notices.view', 'notifications.view_own', 'notifications.manage_preferences', 'analytics.view_own', 'opportunities.view']) {
      const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
      if (p && studentRole) await db.insert(schema.rolePermissions).values({ roleId: studentRole.id, permissionId: p.id });
    }

    for (const key of ['notices.view', 'notices.publish', 'notifications.view_own', 'notifications.manage_preferences', 'analytics.view_all', 'opportunities.view', 'opportunities.create', 'opportunities.publish']) {
      const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
      if (p && facultyRole) await db.insert(schema.rolePermissions).values({ roleId: facultyRole.id, permissionId: p.id });
    }

    for (const key of permissionsList) {
      const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
      if (p && adminRole) await db.insert(schema.rolePermissions).values({ roleId: adminRole.id, permissionId: p.id });
    }

    // Assign roles to users
    if (studentRole) {
      await db.insert(schema.userRoles).values([
        { userId: student1Id, roleId: studentRole.id },
        { userId: student2Id, roleId: studentRole.id },
      ]);
    }
    if (facultyRole) await db.insert(schema.userRoles).values({ userId: facultyId, roleId: facultyRole.id });
    if (adminRole) await db.insert(schema.userRoles).values({ userId: adminId, roleId: adminRole.id });

    // 4. Seed Student Profiles
    await db.insert(schema.studentProfiles).values([
      {
        id: studentProfile1Id,
        userId: student1Id,
        rollNumber: 'CS-001',
        departmentId: deptAId,
        programId,
        batchId: batch2026Id,
        cgpa: '8.5',
        bio: 'Aspiring software engineer',
      },
      {
        id: studentProfile2Id,
        userId: student2Id,
        rollNumber: 'EE-002',
        departmentId: deptBId,
        programId,
        batchId: batch2027Id,
        cgpa: '7.8',
        bio: 'Electronics enthusiast',
      },
    ]);
  });

  afterAll(async () => {
    if (context.client) await context.client.close();
  });

  // ── 1. Notice Board Creation & Management ────────────────────────────────

  it('allows faculty to create a general published notice with attachments', async () => {
    const res = await request(app)
      .post('/api/v1/notices')
      .set(auth(facultyId))
      .send({
        title: 'Campus Placement Drive 2026',
        content: 'Major tech companies are visiting campus next month.',
        category: 'placement',
        status: 'published',
        attachments: [
          { name: 'Schedule.pdf', url: 'https://example.test/schedule.pdf', size: 102400 },
        ],
        isPinned: false,
      });

    expect(res.status).toBe(201);
    expect(responseValue(res, 'data.title')).toBe('Campus Placement Drive 2026');
    expect(responseValue(res, 'data.status')).toBe('published');
    expect(responseValue(res, 'data.attachments.0.name')).toBe('Schedule.pdf');
    generalNoticeId = responseValue(res, 'data.id') as string;
  });

  it('allows faculty to create a notice targeted specifically to Dept A', async () => {
    const res = await request(app)
      .post('/api/v1/notices')
      .set(auth(facultyId))
      .send({
        title: 'CSE Department Hackathon',
        content: 'Exclusive hackathon for CSE students.',
        category: 'academic',
        status: 'published',
        targetDepartmentId: deptAId,
        isPinned: true,
      });

    expect(res.status).toBe(201);
    expect(responseValue(res, 'data.title')).toBe('CSE Department Hackathon');
    expect(responseValue(res, 'data.isPinned')).toBe(true);
    deptANoticeId = responseValue(res, 'data.id') as string;
  });

  it('allows faculty to create a notice targeted specifically to Dept B', async () => {
    const res = await request(app)
      .post('/api/v1/notices')
      .set(auth(facultyId))
      .send({
        title: 'EEE Robotics Seminar',
        content: 'Seminar for EEE students.',
        category: 'event',
        status: 'published',
        targetDepartmentId: deptBId,
      });

    expect(res.status).toBe(201);
  });

  it('allows faculty to create a scheduled future notice', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/v1/notices')
      .set(auth(facultyId))
      .send({
        title: 'Upcoming Scheduled Announcement',
        content: 'This will be visible tomorrow.',
        category: 'general',
        status: 'scheduled',
        publishedAt: tomorrow,
      });

    expect(res.status).toBe(201);
    expect(responseValue(res, 'data.status')).toBe('scheduled');
    scheduledNoticeId = responseValue(res, 'data.id') as string;
  });

  // ── 2. Notice Universal Delivery Verification ───────────────────────────

  it('delivers all published notices universally to Student 1 (including other department notices), but NOT future scheduled notices', async () => {
    const res = await request(app)
      .get('/api/v1/notices')
      .set(auth(student1Id));

    expect(res.status).toBe(200);
    const titles = (responseValue(res, 'data') as Array<{ title: string }>).map((n) => n.title);
    expect(titles).toContain('Campus Placement Drive 2026');
    expect(titles).toContain('CSE Department Hackathon');
    expect(titles).toContain('EEE Robotics Seminar');
    expect(titles).not.toContain('Upcoming Scheduled Announcement');

    // Pinned notice appears first
    expect(titles[0]).toBe('CSE Department Hackathon');
  });

  it('delivers all published notices universally to Student 2 (including Dept A notices)', async () => {
    const res = await request(app)
      .get('/api/v1/notices')
      .set(auth(student2Id));

    expect(res.status).toBe(200);
    const titles = (responseValue(res, 'data') as Array<{ title: string }>).map((n) => n.title);
    expect(titles).toContain('Campus Placement Drive 2026');
    expect(titles).toContain('CSE Department Hackathon');
    expect(titles).toContain('EEE Robotics Seminar');
    expect(titles).not.toContain('Upcoming Scheduled Announcement');

    // Pinned notice appears first
    expect(titles[0]).toBe('CSE Department Hackathon');
  });

  it('allows staff to view all notices including scheduled notices via /manage', async () => {
    const res = await request(app)
      .get('/api/v1/notices/manage')
      .set(auth(facultyId));

    expect(res.status).toBe(200);
    const titles = (responseValue(res, 'data') as Array<{ title: string }>).map((n) => n.title);
    expect(titles).toContain('Upcoming Scheduled Announcement');
  });

  it('allows faculty to pin, unpin, and expire notices', async () => {
    // Unpin CSE Hackathon
    const unpinRes = await request(app)
      .patch(`/api/v1/notices/${deptANoticeId}/pin`)
      .set(auth(facultyId))
      .send({ isPinned: false });
    expect(unpinRes.status).toBe(200);
    expect(responseValue(unpinRes, 'data.isPinned')).toBe(false);

    // Expire General Notice
    const expireRes = await request(app)
      .patch(`/api/v1/notices/${generalNoticeId}/expire`)
      .set(auth(facultyId));
    expect(expireRes.status).toBe(200);
    expect(responseValue(expireRes, 'data.status')).toBe('expired');

    // Student 1 should no longer see the expired notice
    const studentRes = await request(app)
      .get('/api/v1/notices')
      .set(auth(student1Id));
    const titles = (responseValue(studentRes, 'data') as Array<{ title: string }>).map((n) => n.title);
    expect(titles).not.toContain('Campus Placement Drive 2026');
  });

  it('allows faculty to upload a poster image and publish a notice with poster and action links', async () => {
    // 1x1 transparent PNG
    const pngBuffer = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex',
    );

    const uploadRes = await request(app)
      .post('/api/v1/notices/upload-poster')
      .set(auth(facultyId))
      .attach('file', pngBuffer, 'sample-poster.png');

    expect(uploadRes.status).toBe(201);
    const posterUrl = responseValue(uploadRes, 'data.url') as string;
    expect(posterUrl).toMatch(/^\/uploads\/posters\/poster-/);

    // Create notice with posterUrl and actionUrl
    const createRes = await request(app)
      .post('/api/v1/notices')
      .set(auth(facultyId))
      .send({
        title: 'Flagship Hackathon With Poster',
        content: 'Register using the action URL below!',
        category: 'event',
        posterUrl,
        actionUrl: 'https://hackathon.institution.edu/register',
      });

    expect(createRes.status).toBe(201);
    expect(responseValue(createRes, 'data.posterUrl')).toBe(posterUrl);
    expect(responseValue(createRes, 'data.actionUrl')).toBe('https://hackathon.institution.edu/register');

    // Verify it is returned to student with posterUrl and linkUrl
    const listRes = await request(app)
      .get('/api/v1/notices')
      .set(auth(student1Id));

    expect(listRes.status).toBe(200);
    const hackNotice = (responseValue(listRes, 'data') as Array<{
      title: string;
      posterUrl?: string;
      actionUrl?: string;
      linkUrl?: string;
    }>).find((n) => n.title === 'Flagship Hackathon With Poster');

    expect(hackNotice).toBeDefined();
    expect(hackNotice?.posterUrl).toBe(posterUrl);
    expect(hackNotice?.actionUrl).toBe('https://hackathon.institution.edu/register');
    expect(hackNotice?.linkUrl).toBe('https://hackathon.institution.edu/register');
  });

  // ── 3. Notifications & Preferences ──────────────────────────────────────

  it('records persistent in-app notifications and tracks unread count', async () => {
    // Student 1 should have received notifications from notice publications
    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set(auth(student1Id));

    expect(countRes.status).toBe(200);
    const unread = responseValue(countRes, 'data.unreadCount') as number;
    expect(unread).toBeGreaterThan(0);

    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set(auth(student1Id));

    expect(listRes.status).toBe(200);
    const notifs = responseValue(listRes, 'data') as Array<{ id: string; isRead: boolean }>;
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs[0]?.isRead).toBe(false);

    // Mark single notification as read
    const notifId = notifs[0]?.id as string;
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set(auth(student1Id));

    expect(readRes.status).toBe(200);
    expect(responseValue(readRes, 'data.isRead')).toBe(true);

    // Mark all as read
    const markAllRes = await request(app)
      .post('/api/v1/notifications/mark-all-read')
      .set(auth(student1Id));

    expect(markAllRes.status).toBe(200);

    const countAfter = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set(auth(student1Id));
    expect(responseValue(countAfter, 'data.unreadCount')).toBe(0);
  });

  it('prevents Student 2 from marking Student 1 notification as read', async () => {
    const listRes = await request(app)
      .get('/api/v1/notifications')
      .set(auth(student1Id));
    const notifs = responseValue(listRes, 'data') as Array<{ id: string }>;
    const student1NotifId = notifs[0]?.id as string;

    const crossUserRes = await request(app)
      .patch(`/api/v1/notifications/${student1NotifId}/read`)
      .set(auth(student2Id));

    // Should fail with 500 or 400 (unauthorized / not found)
    expect(crossUserRes.status).toBeGreaterThanOrEqual(400);
  });

  it('updates notification preferences and respects muted notification types', async () => {
    const prefRes = await request(app)
      .get('/api/v1/notifications/preferences')
      .set(auth(student1Id));

    expect(prefRes.status).toBe(200);
    expect(responseValue(prefRes, 'data.pushEnabled')).toBe(true);

    // Mute notice_published
    const updateRes = await request(app)
      .put('/api/v1/notifications/preferences')
      .set(auth(student1Id))
      .send({
        emailEnabled: false,
        pushEnabled: true,
        mutedTypes: ['notice_published'],
      });

    expect(updateRes.status).toBe(200);
    expect(responseValue(updateRes, 'data.emailEnabled')).toBe(false);
    expect(responseValue(updateRes, 'data.mutedTypes')).toContain('notice_published');

    // Publish a new notice
    await request(app)
      .post('/api/v1/notices')
      .set(auth(facultyId))
      .send({
        title: 'Another Dept A Notice',
        content: 'Content',
        category: 'academic',
        status: 'published',
        targetDepartmentId: deptAId,
      });

    // Student 1 should NOT have received a notification for notice_published
    const newCountRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set(auth(student1Id));
    expect(responseValue(newCountRes, 'data.unreadCount')).toBe(0);
  });

  // ── 4. Cron Task Execution ──────────────────────────────────────────────

  it('executes scheduled cron tasks and publishes due notices', async () => {
    // Set scheduled notice publish date to past
    await db
      .update(schema.notices)
      .set({ publishedAt: new Date(Date.now() - 60000) })
      .where(eq(schema.notices.id, scheduledNoticeId));

    const cronResult = await cronManager.runAllNow();
    expect(cronResult.publishedNotices).toBeGreaterThanOrEqual(1);

    const updatedScheduled = await db.query.notices.findFirst({
      where: eq(schema.notices.id, scheduledNoticeId),
    });
    expect(updatedScheduled?.status).toBe('published');
  });

  // ── 5. Analytics Verification ───────────────────────────────────────────

  it('returns comprehensive student analytics matching transactional data', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/student')
      .set(auth(student1Id));

    expect(res.status).toBe(200);
    expect(typeof responseValue(res, 'data.profileCompletionPercentage')).toBe('number');
    expect(responseValue(res, 'data.testsAttempted')).toBe(0);
    expect(responseValue(res, 'data.roadmapProgress.hasActiveRoadmap')).toBe(false);
    expect(responseValue(res, 'data.applicationsCount')).toBe(0);
  });

  it('returns faculty analytics including funnel and readiness trends', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/faculty')
      .set(auth(facultyId));

    expect(res.status).toBe(200);
    expect(typeof responseValue(res, 'data.opportunitiesPublished')).toBe('number');
    expect(typeof responseValue(res, 'data.applicationFunnel.applied')).toBe('number');
    expect(responseValue(res, 'data.studentReadinessTrends')).toBeInstanceOf(Array);
    expect(responseValue(res, 'data.studentReadinessTrends.0.departmentName')).toBeDefined();
  });

  it('returns admin analytics covering institution-wide metrics', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/admin')
      .set(auth(adminId));

    expect(res.status).toBe(200);
    expect(responseValue(res, 'data.users.total')).toBe(4);
    expect(responseValue(res, 'data.users.students')).toBe(2);
    expect(responseValue(res, 'data.users.faculty')).toBe(1);
    expect(responseValue(res, 'data.users.admins')).toBe(1);
    expect(responseValue(res, 'data.departmentBreakdown.length')).toBeGreaterThanOrEqual(2);
    expect(responseValue(res, 'data.notificationDelivery.totalNotifications')).toBeGreaterThan(0);
  });
});

