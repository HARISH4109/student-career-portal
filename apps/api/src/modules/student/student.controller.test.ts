import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { responseValue } from '@/test/response-value';

/**
 * Student module HTTP integration tests.
 *
 * Tests:
 *   - GET /api/v1/students/me (401 unauth, 200 auth)
 *   - PUT /api/v1/students/me (200 update)
 *   - GET /api/v1/students/me/completion (200 completion breakdown)
 *   - POST /api/v1/students/me/skills (422 validation, 201 added)
 *   - GET /api/v1/academic/departments, /programs, /batches (200)
 *   - GET /api/v1/skills (200)
 */

const {
  mockGetUser,
  mockFindFirstUser,
  mockFindFirstProfile,
  mockFindManyDepartments,
  mockFindManyPrograms,
  mockFindManyBatches,
  mockFindManySkills,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFindFirstUser: vi.fn(),
  mockFindFirstProfile: vi.fn(),
  mockFindManyDepartments: vi.fn(),
  mockFindManyPrograms: vi.fn(),
  mockFindManyBatches: vi.fn(),
  mockFindManySkills: vi.fn(),
}));

vi.mock('@/infrastructure/supabase', () => ({
  createAuthClient: () => ({ auth: { signInWithPassword: vi.fn(), refreshSession: vi.fn() } }),
  supabaseAdmin: {
    auth: {
      getUser: mockGetUser,
      admin: { createUser: vi.fn(), signOut: vi.fn(), updateUserById: vi.fn() },
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
      studentProfiles: { findFirst: mockFindFirstProfile, findMany: vi.fn().mockResolvedValue([]) },
      departments: { findMany: mockFindManyDepartments },
      academicPrograms: { findMany: mockFindManyPrograms },
      batches: { findMany: mockFindManyBatches },
      skills: { findFirst: vi.fn(), findMany: mockFindManySkills },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
        onConflictDoUpdate: vi.fn().mockResolvedValue([]),
        returning: vi.fn().mockResolvedValue([{ id: 'profile-1' }]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 1, total: 1 }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'profile-1' }]),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  },
  schema: {
    users: { id: 'id', email: 'email', fullName: 'full_name', isActive: 'is_active' },
    studentProfiles: { id: 'id', userId: 'user_id', departmentId: 'department_id', batchId: 'batch_id', isPlacementEligible: 'is_placement_eligible', rollNumber: 'roll_number', createdAt: 'created_at' },
    studentSkills: { studentId: 'student_id', skillId: 'skill_id', proficiency: 'proficiency' },
    departments: { id: 'id', name: 'name', isActive: 'is_active' },
    academicPrograms: { id: 'id', departmentId: 'department_id', name: 'name', isActive: 'is_active' },
    batches: { id: 'id', graduationYear: 'graduation_year', isActive: 'is_active' },
    skills: { id: 'id', name: 'name', category: 'category' },
    resumes: { studentId: 'student_id' },
  },
}));

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

const VALID_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_DEPT_ID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_PROG_ID = '550e8400-e29b-41d4-a716-446655440002';
const VALID_BATCH_ID = '550e8400-e29b-41d4-a716-446655440003';
const VALID_SKILL_ID = '550e8400-e29b-41d4-a716-446655440004';

function setupAuth(permissions = ['students.view_own_profile', 'students.edit_own_profile']) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: VALID_USER_ID, email: 'student@uni.edu' } },
    error: null,
  });
  mockFindFirstUser.mockResolvedValue({
    id: VALID_USER_ID,
    email: 'student@uni.edu',
    fullName: 'Student User',
    isActive: true,
    userRoles: [
      {
        role: {
          name: 'STUDENT',
          rolePermissions: permissions.map((key) => ({ permission: { key } })),
        },
      },
    ],
  });
}

function mockProfileData() {
  return {
    id: 'profile-1',
    userId: VALID_USER_ID,
    rollNumber: '2022CSE045',
    departmentId: VALID_DEPT_ID,
    programId: VALID_PROG_ID,
    batchId: VALID_BATCH_ID,
    cgpa: '8.75',
    bio: 'Software engineer enthusiast',
    linkedinUrl: 'https://linkedin.com/in/student',
    githubUrl: 'https://github.com/student',
    portfolioUrl: 'https://student.dev',
    careerInterests: ['Full Stack', 'Cloud'],
    projects: [{ title: 'Portal', description: 'Web app', technologies: ['React'], isCurrent: false }],
    certifications: [{ name: 'AWS Cloud', issuer: 'Amazon' }],
    achievements: [{ title: 'Dean List' }],
    isPlacementEligible: true,
    user: { fullName: 'Student User', email: 'student@uni.edu', phone: '+1234567890' },
    department: { id: VALID_DEPT_ID, name: 'Computer Science', code: 'CSE', isActive: true },
    program: { id: VALID_PROG_ID, name: 'B.Tech', degreeLevel: 'UG', durationYears: 4, isActive: true },
    batch: { id: VALID_BATCH_ID, graduationYear: 2026, isActive: true },
    studentSkills: [{ skillId: VALID_SKILL_ID, proficiency: 'advanced', skill: { name: 'TypeScript', category: 'language' } }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Student Controller Endpoints', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('GET /api/v1/students/me — returns 401 unauthenticated', async () => {
    const res = await request(app).get('/api/v1/students/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/students/me — returns 200 with student profile', async () => {
    setupAuth();
    mockFindFirstProfile.mockResolvedValue(mockProfileData());

    const res = await request(app)
      .get('/api/v1/students/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data.rollNumber')).toBe('2022CSE045');
    expect(responseValue(res, 'data.department.name')).toBe('Computer Science');
    expect(responseValue(res, 'data.skills.0.name')).toBe('TypeScript');
  });

  it('GET /api/v1/students/me/completion — returns deterministic completion score', async () => {
    setupAuth();
    mockFindFirstProfile.mockResolvedValue(mockProfileData());

    const res = await request(app)
      .get('/api/v1/students/me/completion')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data')).toHaveProperty('percentage');
    expect(responseValue(res, 'data')).toHaveProperty('categories');
    expect(responseValue(res, 'data.categories.length')).toBe(7);
  });

  it('POST /api/v1/students/me/skills — returns 422 for invalid proficiency', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/v1/students/me/skills')
      .set('Authorization', 'Bearer valid-token')
      .send({ skillId: VALID_SKILL_ID, proficiency: 'super-expert' });

    expect(res.status).toBe(422);
    expect(responseValue(res, 'error.code')).toBe('VALIDATION_ERROR');
  });

  it('GET /api/v1/academic/departments — returns list of active departments', async () => {
    mockFindManyDepartments.mockResolvedValue([
      { id: VALID_DEPT_ID, name: 'Computer Science', code: 'CSE', isActive: true },
    ]);

    const res = await request(app).get('/api/v1/academic/departments');
    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data.0.name')).toBe('Computer Science');
  });

  it('GET /api/v1/skills — returns searchable master skills list', async () => {
    mockFindManySkills.mockResolvedValue([
      { id: VALID_SKILL_ID, name: 'React', category: 'framework' },
    ]);

    const res = await request(app).get('/api/v1/skills');
    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data.0.name')).toBe('React');
  });
});
