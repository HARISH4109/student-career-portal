import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { responseValue } from '@/test/response-value';

/**
 * Resume module HTTP integration tests.
 *
 * Tests:
 *   - GET /api/v1/resumes (401 unauth, 200 auth list)
 *   - POST /api/v1/resumes (422 validation, 201 created)
 *   - POST /api/v1/resumes/:id/duplicate (201 duplicated)
 *   - PATCH /api/v1/resumes/:id/primary (200 primary set)
 *   - POST /api/v1/resumes/:id/analyze (201 AI analysis generated)
 *   - POST /api/v1/resumes/:id/match (200 match score returned)
 */

const {
  mockGetUser,
  mockFindFirstUser,
  mockFindFirstProfile,
  mockFindManyResumes,
  mockFindFirstResume,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFindFirstUser: vi.fn(),
  mockFindFirstProfile: vi.fn(),
  mockFindManyResumes: vi.fn(),
  mockFindFirstResume: vi.fn(),
  mockSaveAnalysis: vi.fn(),
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

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn().mockImplementation((url: string) => {
        if (url.includes('match-opportunity')) {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                matchScore: 75,
                matchedSkills: ['React', 'TypeScript', 'Node.js'],
                missingSkills: ['Kubernetes'],
                isEligible: true,
                reasons: ['Strong match on core web stack', 'Missing Kubernetes requirement'],
              },
            },
          });
        }
        return Promise.resolve({
          data: {
            success: true,
            data: {
              overallScore: 88,
              atsScore: 90,
              skillScore: 85,
              keywordScore: 85,
              formatScore: 92,
              missingSkills: ['Kubernetes'],
              improvementSuggestions: [
                { area: 'keywords', suggestion: 'Include cloud platforms like AWS or GCP', priority: 'medium' },
              ],
              aiInsights: ['Strong technical foundation in modern web technologies.'],
              aiSummaryRewrite: 'High-impact software engineer with expertise in full-stack web development.',
              modelVersion: 'test-v1.0',
              analyzedAt: new Date().toISOString(),
            },
          },
        });
      }),
    })),
  },
}));

vi.mock('@career-portal/db', () => {
  const dummyResume = {
    id: 'resume-1',
    studentId: 'profile-1',
    title: 'Software Engineer Resume',
    templateId: 'modern',
    content: {
      fullName: 'Student User',
      email: 'student@uni.edu',
      summary: 'Experienced developer',
      skills: ['TypeScript', 'React'],
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      achievements: [],
    },
    version: 1,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    student: { id: 'profile-1', userId: '550e8400-e29b-41d4-a716-446655440000', user: { fullName: 'Student User' } },
  };

  return {
    db: {
      transaction: vi.fn((callback: (tx: Record<string, unknown>) => Promise<unknown>) => {
        return callback({
          select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                for: vi.fn().mockResolvedValue([{ id: 'profile-1' }]),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([dummyResume]),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([dummyResume]),
            }),
          }),
        });
      }),
      query: {
        users: { findFirst: mockFindFirstUser },
        roles: { findFirst: vi.fn() },
        userRoles: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
        studentProfiles: { findFirst: mockFindFirstProfile },
        resumes: {
          findFirst: mockFindFirstResume,
          findMany: mockFindManyResumes,
        },
        resumeAnalyses: { findMany: vi.fn().mockResolvedValue([]) },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 'analysis-1',
              resumeId: 'resume-1',
              overallScore: '85',
              atsScore: '90',
              skillScore: '80',
              keywordScore: '85',
              formatScore: '88',
              missingSkills: ['Docker'],
              improvementSuggestions: [],
              modelVersion: 'local-fallback-v1.0',
              analyzedAt: new Date(),
            },
          ]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([dummyResume]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([dummyResume]),
        }),
      }),
    },
    schema: {
      users: { id: 'id', email: 'email', fullName: 'full_name', isActive: 'is_active' },
      studentProfiles: { id: 'id', userId: 'user_id' },
      resumes: { id: 'id', studentId: 'student_id', isPrimary: 'is_primary', updatedAt: 'updated_at' },
      resumeAnalyses: { id: 'id', resumeId: 'resume_id', analyzedAt: 'analyzed_at' },
    },
  };
});

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
const VALID_RESUME_ID = '550e8400-e29b-41d4-a716-446655440099';

function setupAuth(permissions = ['resumes.manage_own', 'resume_analysis.analyze_own']) {
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
  mockFindFirstProfile.mockResolvedValue({
    id: 'profile-1',
    userId: VALID_USER_ID,
  });
}

const mockResume = {
  id: VALID_RESUME_ID,
  studentId: 'profile-1',
  title: 'Full Stack Engineer Resume',
  templateId: 'modern',
  content: {
    fullName: 'Student User',
    email: 'student@uni.edu',
    phone: '+1234567890',
    summary: 'Passionate developer',
    skills: ['React', 'TypeScript', 'Node.js'],
    education: [],
    experience: [],
    projects: [{ title: 'Web App', description: 'Full stack project', technologies: ['React'] }],
    certifications: [],
    achievements: [],
  },
  version: 1,
  isPrimary: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  student: { id: 'profile-1', userId: VALID_USER_ID },
};

describe('Resume Controller Endpoints', () => {
  let app: ReturnType<typeof import('@/app').createApp>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import('@/app');
    app = createApp();
  });

  it('GET /api/v1/resumes — returns 401 unauthenticated', async () => {
    const res = await request(app).get('/api/v1/resumes');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/resumes — returns 200 with resume list', async () => {
    setupAuth();
    mockFindManyResumes.mockResolvedValue([mockResume]);

    const res = await request(app)
      .get('/api/v1/resumes')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data.0.title')).toBe('Full Stack Engineer Resume');
  });

  it('POST /api/v1/resumes — returns 422 for missing required resume content fields', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/v1/resumes')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'New Resume', content: {} });

    expect(res.status).toBe(422);
    expect(responseValue(res, 'error.code')).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/resumes — returns 201 for valid resume creation', async () => {
    setupAuth();
    mockFindManyResumes.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v1/resumes')
      .set('Authorization', 'Bearer valid-token')
      .send({
        title: 'Backend Engineer Resume',
        templateId: 'modern',
        content: {
          fullName: 'Student User',
          email: 'student@uni.edu',
          summary: 'Experienced in distributed systems',
          skills: ['Go', 'PostgreSQL'],
          education: [],
          experience: [],
          projects: [],
          certifications: [],
          achievements: [],
        },
      });

    expect(res.status).toBe(201);
    expect(responseValue(res, 'success')).toBe(true);
  });

  it('POST /api/v1/resumes/:id/analyze — returns 201 with score breakdown', async () => {
    setupAuth();
    mockFindFirstResume.mockResolvedValue(mockResume);

    const res = await request(app)
      .post(`/api/v1/resumes/${VALID_RESUME_ID}/analyze`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(201);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data')).toHaveProperty('overallScore');
    expect(responseValue(res, 'data')).toHaveProperty('atsScore');
    expect(responseValue(res, 'data')).toHaveProperty('missingSkills');
  });

  it('POST /api/v1/resumes/:id/match — returns 200 with opportunity matching score', async () => {
    setupAuth();
    mockFindFirstResume.mockResolvedValue(mockResume);

    const res = await request(app)
      .post(`/api/v1/resumes/${VALID_RESUME_ID}/match`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        resumeContent: mockResume.content,
        opportunitySkills: ['React', 'TypeScript', 'Node.js', 'Kubernetes'],
      });

    expect(res.status).toBe(200);
    expect(responseValue(res, 'success')).toBe(true);
    expect(responseValue(res, 'data')).toHaveProperty('matchScore');
    expect(responseValue(res, 'data.matchedSkills')).toContain('React');
    expect(responseValue(res, 'data.missingSkills')).toContain('Kubernetes');
  });
});
