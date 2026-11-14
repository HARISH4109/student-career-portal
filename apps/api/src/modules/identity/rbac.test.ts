import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from '@/middlewares/error-handler.middleware';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requireAnyPermission, requirePermission } from '@/middlewares/require-permission.middleware';
import { requireRole } from '@/middlewares/require-role.middleware';
import { ForbiddenError } from '@/shared/errors/app-error';

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const { mockGetUser, mockFindFirstUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFindFirstUser: vi.fn(),
}));

vi.mock('@/infrastructure/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: mockGetUser,
    },
  },
}));

vi.mock('@career-portal/db', () => ({
  db: {
    query: {
      users: {
        findFirst: mockFindFirstUser,
      },
    },
  },
  schema: {
    users: { id: 'id' },
  },
}));

vi.mock('@/infrastructure/logger', () => {
  const noop = vi.fn();
  return {
    logger: {
      info: noop,
      warn: noop,
      error: noop,
      debug: noop,
    },
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────

const STUDENT_ID = 'student-uuid-1111';
const FACULTY_ID = 'faculty-uuid-2222';
const ADMIN_ID = 'admin-uuid-3333';

function mockUserInDb(
  id: string,
  roles: Array<'STUDENT' | 'PLACEMENT_FACULTY' | 'ADMIN'>,
  permissions: string[],
  isActive = true,
) {
  return {
    id,
    email: `${id}@univ.test`,
    fullName: `User ${id}`,
    isActive,
    userRoles: roles.map((roleName) => ({
      role: {
        name: roleName,
        rolePermissions: permissions.map((key) => ({
          permission: { key },
        })),
      },
    })),
  };
}

function setupAuthContext(
  userId: string,
  roles: Array<'STUDENT' | 'PLACEMENT_FACULTY' | 'ADMIN'>,
  permissions: string[],
  isActive = true,
) {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: userId,
        email: `${userId}@univ.test`,
        user_metadata: { full_name: `User ${userId}` },
      },
    },
    error: null,
  });

  mockFindFirstUser.mockResolvedValue(
    mockUserInDb(userId, roles, permissions, isActive),
  );
}

// ── App Factory ────────────────────────────────────────────────────────────

function createRbacTestApp() {
  const app = express();
  app.use(express.json());

  // Public route — no auth required
  app.get('/public', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'public content' });
  });

  // Student-only route
  app.get(
    '/student-dashboard',
    requireAuth,
    requireRole('STUDENT'),
    (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'welcome student' });
    },
  );

  // Faculty-only route
  app.get(
    '/faculty-portal',
    requireAuth,
    requireRole('PLACEMENT_FACULTY'),
    (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'welcome faculty' });
    },
  );

  // Admin-only route
  app.get(
    '/admin-panel',
    requireAuth,
    requireRole('ADMIN'),
    (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'welcome admin' });
    },
  );

  // Multiple permission route (AND logic)
  app.post(
    '/opportunities/publish-action',
    requireAuth,
    requirePermission('opportunities.create', 'opportunities.publish'),
    (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'opportunity published' });
    },
  );

  // Any permission route (OR logic)
  app.get(
    '/reports/view',
    requireAuth,
    requireAnyPermission('analytics.view_own', 'analytics.view_all'),
    (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'reports viewable' });
    },
  );

  app.use(errorHandler);
  return app;
}

// ── Test Suites ────────────────────────────────────────────────────────────

describe('RBAC & Authorization Middleware Matrix', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createRbacTestApp();
  });

  describe('1. Public Route Access', () => {
    it('allows access to public route without any authorization token', async () => {
      const res = await request(app).get('/public');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'public content' });
    });
  });

  describe('2. Missing or Invalid JWT Rejection', () => {
    it('rejects protected routes with 401 when Authorization header is missing', async () => {
      const res = await request(app).get('/student-dashboard');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Missing or malformed Authorization header');
    });

    it('rejects protected routes with 401 when Authorization header does not start with Bearer', async () => {
      const res = await request(app)
        .get('/admin-panel')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects with 401 when token is expired or invalid in Supabase', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'token is expired by 300s' },
      });

      const res = await request(app)
        .get('/faculty-portal')
        .set('Authorization', 'Bearer expired-jwt-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid or expired access token');
    });

    it('rejects with 401 when authenticated user is deactivated in database', async () => {
      setupAuthContext(STUDENT_ID, ['STUDENT'], [], false); // isActive = false

      const res = await request(app)
        .get('/student-dashboard')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('User account not found or deactivated');
    });
  });

  describe('3. Student-Only Routes', () => {
    it('allows access for a student user', async () => {
      setupAuthContext(STUDENT_ID, ['STUDENT'], ['opportunities.view']);

      const res = await request(app)
        .get('/student-dashboard')
        .set('Authorization', 'Bearer valid-student-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('welcome student');
    });

    it('rejects faculty from student-only route with 403', async () => {
      setupAuthContext(FACULTY_ID, ['PLACEMENT_FACULTY'], ['opportunities.create']);

      const res = await request(app)
        .get('/student-dashboard')
        .set('Authorization', 'Bearer valid-faculty-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Requires one of the following roles: STUDENT');
    });

    it('rejects admin from student-only route with 403 when admin does not have STUDENT role', async () => {
      setupAuthContext(ADMIN_ID, ['ADMIN'], ['admin.manage_users']);

      const res = await request(app)
        .get('/student-dashboard')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('4. Faculty-Only Routes', () => {
    it('allows access for a placement faculty user', async () => {
      setupAuthContext(FACULTY_ID, ['PLACEMENT_FACULTY'], ['opportunities.create']);

      const res = await request(app)
        .get('/faculty-portal')
        .set('Authorization', 'Bearer valid-faculty-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('welcome faculty');
    });

    it('rejects students from faculty-only route with 403', async () => {
      setupAuthContext(STUDENT_ID, ['STUDENT'], ['opportunities.view']);

      const res = await request(app)
        .get('/faculty-portal')
        .set('Authorization', 'Bearer valid-student-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Requires one of the following roles: PLACEMENT_FACULTY');
    });
  });

  describe('5. Admin-Only Routes', () => {
    it('allows access for an admin user', async () => {
      setupAuthContext(ADMIN_ID, ['ADMIN'], ['admin.manage_users']);

      const res = await request(app)
        .get('/admin-panel')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('welcome admin');
    });

    it('rejects non-admin users (students) with 403', async () => {
      setupAuthContext(STUDENT_ID, ['STUDENT'], ['opportunities.view']);

      const res = await request(app)
        .get('/admin-panel')
        .set('Authorization', 'Bearer valid-student-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Requires one of the following roles: ADMIN');
    });

    it('rejects non-admin users (faculty) with 403', async () => {
      setupAuthContext(FACULTY_ID, ['PLACEMENT_FACULTY'], ['opportunities.create']);

      const res = await request(app)
        .get('/admin-panel')
        .set('Authorization', 'Bearer valid-faculty-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Requires one of the following roles: ADMIN');
    });
  });

  describe('6. Multiple Permission Checks (AND logic)', () => {
    it('allows access when user possesses ALL required permissions', async () => {
      setupAuthContext(FACULTY_ID, ['PLACEMENT_FACULTY'], [
        'opportunities.create',
        'opportunities.publish',
      ]);

      const res = await request(app)
        .post('/opportunities/publish-action')
        .set('Authorization', 'Bearer valid-faculty-token')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('opportunity published');
    });

    it('rejects when user only has one of the required permissions (partial match)', async () => {
      setupAuthContext(FACULTY_ID, ['PLACEMENT_FACULTY'], [
        'opportunities.create',
        // missing 'opportunities.publish'
      ]);

      const res = await request(app)
        .post('/opportunities/publish-action')
        .set('Authorization', 'Bearer valid-faculty-token')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Missing required permission(s)');
    });

    it('rejects when user has none of the required permissions', async () => {
      setupAuthContext(STUDENT_ID, ['STUDENT'], ['opportunities.view']);

      const res = await request(app)
        .post('/opportunities/publish-action')
        .set('Authorization', 'Bearer valid-student-token')
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('7. requireAnyPermission (OR logic)', () => {
    it('allows access when user has at least one matching permission', async () => {
      setupAuthContext(STUDENT_ID, ['STUDENT'], ['analytics.view_own']);

      const res = await request(app)
        .get('/reports/view')
        .set('Authorization', 'Bearer valid-student-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('reports viewable');
    });

    it('rejects when user has none of the matching permissions', async () => {
      setupAuthContext(STUDENT_ID, ['STUDENT'], ['opportunities.view']);

      const res = await request(app)
        .get('/reports/view')
        .set('Authorization', 'Bearer valid-student-token');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
      expect(res.body.error.message).toContain('Requires at least one of');
    });
  });

  describe('8. Middleware Direct Invocation Edge Cases', () => {
    it('requireRole throws ForbiddenError when req.user is undefined', () => {
      const middleware = requireRole('STUDENT');
      const req = {} as Request;
      const res = {} as Response;
      let caughtError: unknown;

      middleware(req, res, (err) => {
        caughtError = err;
      });

      expect(caughtError).toBeInstanceOf(ForbiddenError);
      expect((caughtError as ForbiddenError).message).toContain('requireAuth must precede requireRole');
    });

    it('requirePermission throws ForbiddenError when req.user is undefined', () => {
      const middleware = requirePermission('opportunities.view');
      const req = {} as Request;
      const res = {} as Response;
      let caughtError: unknown;

      middleware(req, res, (err) => {
        caughtError = err;
      });

      expect(caughtError).toBeInstanceOf(ForbiddenError);
      expect((caughtError as ForbiddenError).message).toContain('requireAuth must precede requirePermission');
    });

    it('requireAnyPermission throws ForbiddenError when req.user is undefined', () => {
      const middleware = requireAnyPermission('analytics.view_own');
      const req = {} as Request;
      const res = {} as Response;
      let caughtError: unknown;

      middleware(req, res, (err) => {
        caughtError = err;
      });

      expect(caughtError).toBeInstanceOf(ForbiddenError);
      expect((caughtError as ForbiddenError).message).toContain('Authentication context missing');
    });
  });
});
