import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { responseValue } from '@/test/response-value';

/**
 * Auth middleware + controller integration tests.
 *
 * These test the HTTP boundary: request validation, JWT enforcement,
 * permission checks, and response envelope shapes. Supabase Auth and
 * the database are mocked to keep tests fast and deterministic.
 *
 * Per Phase 1 spec, we must cover:
 *   - Missing token → 401
 *   - Invalid / malformed JWT → 401
 *   - Expired JWT → 401
 *   - Wrong permission → 403
 *   - Disabled user → 401
 *   - Duplicate signup → 409
 *   - Successful signup → 201
 *   - Successful signin → 200
 *   - Auth sync → 200
 */

// ── Mocks ──────────────────────────────────────────────────────────────
// vi.mock factories are hoisted — they cannot reference module-scoped
// variables declared outside the factory. We use vi.hoisted() for any
// values the factories need.

const {
  mockGetUser,
  mockCreateUser,
  mockSignInWithPassword,
  mockSignOut,
  mockResetPasswordForEmail,
  mockFindFirstUser,
  mockFindManyUserRoles,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateUser: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignOut: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
  mockFindFirstUser: vi.fn(),
  mockFindManyUserRoles: vi.fn(),
}));

// Mock Supabase admin client
vi.mock('@/infrastructure/supabase', () => ({
  createAuthClient: () => ({ auth: { signInWithPassword: mockSignInWithPassword, refreshSession: vi.fn() } }),
  supabaseAdmin: {
    auth: {
      getUser: mockGetUser,
      admin: {
        createUser: mockCreateUser,
        signOut: mockSignOut,
        updateUserById: vi.fn().mockResolvedValue({ error: null }),
      },
      signInWithPassword: mockSignInWithPassword,
      refreshSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'new-access',
            refresh_token: 'new-refresh',
            expires_at: 9999999999,
          },
        },
        error: null,
      }),
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  },
}));

// Mock Redis — no actual Redis needed in tests
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

// Mock DB — drizzle queries
vi.mock('@career-portal/db', () => ({
  db: {
    query: {
      users: { findFirst: mockFindFirstUser },
      roles: { findFirst: vi.fn() },
      userRoles: { findFirst: vi.fn(), findMany: mockFindManyUserRoles },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: 'user-1' }]),
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

// Mock logger — must provide a pino-compatible shape including child()
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

function makeSupabaseUser(overrides?: Record<string, unknown>) {
  return {
    id: VALID_USER_ID,
    email: 'student@university.edu',
    user_metadata: { full_name: 'Test Student' },
    ...overrides,
  };
}

function makeDbUserWithRoles(
  roleName = 'STUDENT',
  permissions: string[] = ['opportunities.view', 'applications.apply'],
  isActive = true,
) {
  return {
    id: VALID_USER_ID,
    email: 'student@university.edu',
    fullName: 'Test Student',
    phone: null,
    isActive,
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

function setupAuthenticatedUser(
  roleName = 'STUDENT',
  permissions: string[] = ['opportunities.view', 'applications.apply'],
  isActive = true,
) {
  mockGetUser.mockResolvedValue({
    data: { user: makeSupabaseUser() },
    error: null,
  });
  mockFindFirstUser.mockResolvedValue(makeDbUserWithRoles(roleName, permissions, isActive));
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('Auth Middleware — JWT Enforcement', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('returns 401 when Authorization header is malformed (not Bearer)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Basic abc123');

    expect(res.status).toBe(401);
    expect(responseValue(res, 'error.code')).toBe('UNAUTHORIZED');
  });

  it('returns 401 when JWT is invalid / rejected by Supabase', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(responseValue(res, 'error.code')).toBe('UNAUTHORIZED');
    expect(responseValue(res, 'error.message')).toBe('Invalid or expired access token');
  });

  it('returns 401 when user account is deactivated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: makeSupabaseUser() },
      error: null,
    });
    // isActive = false
    mockFindFirstUser.mockResolvedValue(makeDbUserWithRoles('STUDENT', [], false));

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(401);
    expect(responseValue(res, 'error.message')).toBe('User account not found or deactivated');
  });

  it('returns 401 when user not found in app DB', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: makeSupabaseUser() },
      error: null,
    });
    mockFindFirstUser.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(401);
  });
});

describe('Auth Routes — Permission Enforcement', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('returns 403 when student tries to access admin user management', async () => {
    setupAuthenticatedUser('STUDENT', ['opportunities.view', 'applications.apply']);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
    expect(responseValue(res, 'error.code')).toBe('FORBIDDEN');
  });

  it('allows admin to access user management endpoint', async () => {
    setupAuthenticatedUser('ADMIN', ['admin.manage_users']);

    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer valid-token');

    // May return 200 or error depending on DB mock, but NOT 403
    expect(res.status).not.toBe(403);
  });
});

describe('POST /api/v1/auth/signup', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('returns 422 for invalid signup data (missing email)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ password: 'Test1234!', fullName: 'Test User' });

    expect(res.status).toBe(422);
    expect(responseValue(res, 'error.code')).toBe('VALIDATION_ERROR');
  });

  it('returns 422 for short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'test@uni.edu', password: '123', fullName: 'Test User' });

    expect(res.status).toBe(422);
    expect(responseValue(res, 'error.code')).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/auth/signin', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('returns 422 for missing email in signin body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signin')
      .send({ password: 'Test1234!' });

    expect(res.status).toBe(422);
    expect(responseValue(res, 'error.code')).toBe('VALIDATION_ERROR');
  });

  it('returns 401 for wrong credentials', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid credentials' },
    });

    const res = await request(app)
      .post('/api/v1/auth/signin')
      .send({ email: 'test@uni.edu', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(responseValue(res, 'error.code')).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('always returns success to prevent email enumeration', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@uni.edu' });

    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data.message')).toContain('If an account exists');
  });

  it('returns 422 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/sync', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/v1/auth/sync');

    expect(res.status).toBe(401);
  });

  it('returns user context for authenticated user', async () => {
    setupAuthenticatedUser('STUDENT', ['opportunities.view']);
    mockFindManyUserRoles.mockResolvedValue([{ roleId: 'role-1' }]);

    const res = await request(app)
      .post('/api/v1/auth/sync')
      .set('Authorization', 'Bearer valid-token');

    // The sync endpoint should succeed (200) for authenticated users
    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data')).toHaveProperty('id');
    expect(responseValue(res, 'data')).toHaveProperty('roles');
    expect(responseValue(res, 'data')).toHaveProperty('permissions');
  });
});

describe('GET /api/v1/auth/me', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('returns full user context for authenticated user', async () => {
    setupAuthenticatedUser('STUDENT', ['opportunities.view', 'applications.apply']);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data')).toMatchObject({
      id: VALID_USER_ID,
      email: 'student@university.edu',
      fullName: 'Test Student',
      roles: ['STUDENT'],
      permissions: ['opportunities.view', 'applications.apply'],
    });
  });
});
