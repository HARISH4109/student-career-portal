import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { db, schema } from '@career-portal/db';
import type { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
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
      getUser: (token: string) => {
        if (token === 'expired-jwt-token') {
          return Promise.resolve({
            data: { user: null },
            error: { message: 'token is expired by 300s' },
          });
        }
        if (token === 'invalid-token') {
          return Promise.resolve({
            data: { user: null },
            error: { message: 'invalid token signature' },
          });
        }
        return Promise.resolve({
          data: {
            user: {
              id: token,
              email: `${token}@univ.test`,
              user_metadata: { full_name: `User ${token}` },
            },
          },
          error: null,
        });
      },
    },
  },
}));

describe('Phase 9 — Auth to API Integration Tests', () => {
  const app = createApp();

  const adminId = randomUUID();
  const facultyId = randomUUID();
  const studentId = randomUUID();

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

    // 1. Seed users
    await db.insert(schema.users).values([
      { id: adminId, email: 'admin@univ.test', fullName: 'Portal Admin', isActive: true },
      { id: facultyId, email: 'faculty@univ.test', fullName: 'Placement Faculty', isActive: true },
      { id: studentId, email: 'student@univ.test', fullName: 'Student One', isActive: true },
    ]);

    // 2. Seed roles & permissions
    const permissions = [
      'admin.manage_users',
      'opportunities.view',
      'opportunities.create',
      'opportunities.publish',
      'applications.apply',
      'applications.view_own',
    ];

    for (const key of permissions) {
      await db.insert(schema.permissions).values({ key }).onConflictDoNothing();
    }

    const [adminRole] = await db.insert(schema.roles).values({ name: 'ADMIN' }).returning();
    const [facultyRole] = await db.insert(schema.roles).values({ name: 'PLACEMENT_FACULTY' }).returning();
    const [studentRole] = await db.insert(schema.roles).values({ name: 'STUDENT' }).returning();

    if (adminRole) {
      for (const key of permissions) {
        const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
        if (p) await db.insert(schema.rolePermissions).values({ roleId: adminRole.id, permissionId: p.id });
      }
      await db.insert(schema.userRoles).values([{ userId: adminId, roleId: adminRole.id }]);
    }

    if (facultyRole) {
      for (const key of ['opportunities.view', 'opportunities.create', 'opportunities.publish']) {
        const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
        if (p) await db.insert(schema.rolePermissions).values({ roleId: facultyRole.id, permissionId: p.id });
      }
      await db.insert(schema.userRoles).values([{ userId: facultyId, roleId: facultyRole.id }]);
    }

    if (studentRole) {
      for (const key of ['opportunities.view', 'applications.apply', 'applications.view_own']) {
        const p = await db.query.permissions.findFirst({ where: eq(schema.permissions.key, key) });
        if (p) await db.insert(schema.rolePermissions).values({ roleId: studentRole.id, permissionId: p.id });
      }
      await db.insert(schema.userRoles).values([{ userId: studentId, roleId: studentRole.id }]);
    }
  });

  describe('1. Missing and Expired JWT Handling', () => {
    it('returns 401 when Authorization header is missing on protected route', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(responseValue(res, 'success')).toBe(false);
      expect(responseValue(res, 'error.code')).toBe('UNAUTHORIZED');
      expect(responseValue(res, 'error.message')).toContain('Authorization header');
    });

    it('returns 401 when Authorization token is expired', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(auth('expired-jwt-token'));

      expect(res.status).toBe(401);
      expect(responseValue(res, 'success')).toBe(false);
      expect(responseValue(res, 'error.code')).toBe('UNAUTHORIZED');
      expect(responseValue(res, 'error.message')).toBe('Invalid or expired access token');
    });

    it('returns 401 when Authorization token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(auth('invalid-token'));

      expect(res.status).toBe(401);
      expect(responseValue(res, 'success')).toBe(false);
      expect(responseValue(res, 'error.code')).toBe('UNAUTHORIZED');
    });
  });

  describe('2. Valid JWT Authentication Flow', () => {
    it('allows authenticated user with valid JWT to fetch user profile context', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(auth(studentId));

      expect(res.status).toBe(200);
      expect(responseValue(res, 'success')).toBe(true);
      expect(responseValue(res, 'data.id')).toBe(studentId);
      expect(responseValue(res, 'data.email')).toBe('student@univ.test');
      expect(responseValue(res, 'data.roles')).toEqual(['STUDENT']);
      expect(responseValue(res, 'data.permissions')).toContain('opportunities.view');
    });
  });

  describe('3. Role Guard Enforcement (403 Forbidden)', () => {
    it('rejects student attempting to access admin route with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set(auth(studentId));

      expect(res.status).toBe(403);
      expect(responseValue(res, 'success')).toBe(false);
      expect(responseValue(res, 'error.code')).toBe('FORBIDDEN');
    });

    it('rejects faculty attempting to access admin route with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set(auth(facultyId));

      expect(res.status).toBe(403);
      expect(responseValue(res, 'success')).toBe(false);
      expect(responseValue(res, 'error.code')).toBe('FORBIDDEN');
    });

    it('permits admin user to access admin route with 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set(auth(adminId));

      expect(res.status).toBe(200);
      expect(responseValue(res, 'success')).toBe(true);
      expect(Array.isArray(responseValue(res, 'data'))).toBe(true);
    });
  });
});
