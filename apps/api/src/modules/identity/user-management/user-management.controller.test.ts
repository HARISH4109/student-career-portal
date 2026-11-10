import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { responseValue } from '@/test/response-value';

/**
 * User management endpoint tests.
 *
 * Per Phase 1 spec, we must verify:
 *   - Non-admin cannot access admin endpoints → 403
 *   - Faculty cannot access admin-only routes → 403
 *   - Admin can access user management → 200
 */

// ── Mocks (hoisted for vi.mock factory usage) ──────────────────────────

const { mockGetUser, mockFindFirstUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFindFirstUser: vi.fn(),
}));

// Mock Supabase admin client
vi.mock('@/infrastructure/supabase', () => ({
  createAuthClient: () => ({ auth: { signInWithPassword: vi.fn(), refreshSession: vi.fn() } }),
  supabaseAdmin: {
    auth: {
      getUser: mockGetUser,
      admin: {
        createUser: vi.fn(),
        signOut: vi.fn(),
        updateUserById: vi.fn(),
      },
      signInWithPassword: vi.fn(),
      refreshSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock('@/infrastructure/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    connect: vi.fn(),
    on: vi.fn(),
  },
  CacheKeys: {
    userPermissions: (id: string) => `user:${id}:permissions`,
    userSession: (id: string) => `user:${id}:session`,
  },
  PERMISSIONS_CACHE_TTL: 300,
}));

vi.mock('@career-portal/db', () => ({
  db: {
    query: {
      users: { findFirst: mockFindFirstUser },
      roles: { findFirst: vi.fn() },
      userRoles: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ total: 0 }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  schema: {
    users: { id: 'id', email: 'email', fullName: 'full_name', isActive: 'is_active' },
    roles: { id: 'id', name: 'name' },
    userRoles: { userId: 'user_id', roleId: 'role_id' },
    rolePermissions: {},
    permissions: {},
  },
}));

// Mock logger — pino-compatible shape
vi.mock('@/infrastructure/logger', () => {
  const noop = vi.fn();
  const levels = {
    values: { fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10 },
    labels: { 60: 'fatal', 50: 'error', 40: 'warn', 30: 'info', 20: 'debug', 10: 'trace' },
  };
  const childLogger: Record<string, unknown> = {
    info: noop, warn: noop, error: noop, debug: noop, fatal: noop, trace: noop,
    silent: noop, child: vi.fn(), level: 'info', levels,
    isLevelEnabled: vi.fn().mockReturnValue(false),
  };
  childLogger.child = vi.fn().mockReturnValue(childLogger);
  return {
    logger: {
      info: noop, warn: noop, error: noop, debug: noop, fatal: noop, trace: noop,
      silent: noop,
      child: vi.fn().mockReturnValue(childLogger),
      level: 'info', levels,
      isLevelEnabled: vi.fn().mockReturnValue(false),
    },
  };
});

// ── Helpers ─────────────────────────────────────────────────────────────

const VALID_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function makeSupabaseUser() {
  return {
    id: VALID_USER_ID,
    email: 'admin@university.edu',
    user_metadata: { full_name: 'Admin User' },
  };
}

function makeDbUserWithRole(
  roleName: string,
  permissions: string[],
) {
  return {
    id: VALID_USER_ID,
    email: 'admin@university.edu',
    fullName: 'Admin User',
    phone: null,
    isActive: true,
    userRoles: [
      {
        role: {
          name: roleName,
          rolePermissions: permissions.map((key) => ({
            permission: { key },
          })),
        },
      },
    ],
  };
}

function setupAuth(roleName: string, permissions: string[]) {
  mockGetUser.mockResolvedValue({
    data: { user: makeSupabaseUser() },
    error: null,
  });
  mockFindFirstUser.mockResolvedValue(makeDbUserWithRole(roleName, permissions));
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('GET /api/v1/admin/users — Permission Enforcement', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/admin/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for STUDENT role (no admin permissions)', async () => {
    setupAuth('STUDENT', ['opportunities.view', 'applications.apply']);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
    expect(responseValue(res, 'error.code')).toBe('FORBIDDEN');
  });

  it('returns 403 for PLACEMENT_FACULTY (no admin.manage_users permission)', async () => {
    setupAuth('PLACEMENT_FACULTY', [
      'opportunities.view',
      'opportunities.create',
      'opportunities.publish',
    ]);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
    expect(responseValue(res, 'error.code')).toBe('FORBIDDEN');
  });

  it('allows ADMIN with admin.manage_users permission', async () => {
    setupAuth('ADMIN', ['admin.manage_users']);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer valid-token');

    // Should not be 401 or 403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe('POST /api/v1/admin/users/:id/roles — Role Assignment', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('returns 403 for student trying to assign roles', async () => {
    setupAuth('STUDENT', ['opportunities.view']);

    const res = await request(app)
      .post(`/api/v1/admin/users/${VALID_USER_ID}/roles`)
      .set('Authorization', 'Bearer valid-token')
      .send({ role: 'PLACEMENT_FACULTY' });

    expect(res.status).toBe(403);
    expect(responseValue(res, 'error.code')).toBe('FORBIDDEN');
  });

  it('returns 403 for faculty trying to assign roles', async () => {
    setupAuth('PLACEMENT_FACULTY', ['opportunities.view', 'notices.publish']);

    const res = await request(app)
      .post(`/api/v1/admin/users/${VALID_USER_ID}/roles`)
      .set('Authorization', 'Bearer valid-token')
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });
});
