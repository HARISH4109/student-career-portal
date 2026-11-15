import type { Page } from '@playwright/test';

export interface MockUser {
  id: string;
  email: string;
  fullName: string;
  roles: Array<'STUDENT' | 'PLACEMENT_FACULTY' | 'ADMIN'>;
  permissions: string[];
}

export const STUDENT_PERMISSIONS = [
  'opportunities.view',
  'applications.view',
  'applications.create',
  'applications.withdraw',
  'resumes.view_own',
  'resumes.manage_own',
  'profile.view_own',
  'profile.manage_own',
  'mock_tests.view',
  'mock_tests.attempt',
  'resources.view',
  'roadmaps.manage_own',
  'skill_gap.analyze_own',
  'notices.view',
];

export const FACULTY_PERMISSIONS = [
  'opportunities.view',
  'opportunities.create',
  'opportunities.edit',
  'opportunities.publish',
  'opportunities.delete',
  'applications.view',
  'applications.manage_status',
  'analytics.view',
  'career_paths.manage',
  'resources.view',
  'resources.manage',
  'notices.view',
  'notices.manage',
  'mock_tests.view',
  'mock_tests.manage',
];

export const ADMIN_PERMISSIONS = [
  ...FACULTY_PERMISSIONS,
  'users.manage',
  'audit.view',
  'system.health',
  'academic.programs.manage',
];

export async function mockSession(
  page: Page,
  role: 'STUDENT' | 'PLACEMENT_FACULTY' | 'ADMIN' = 'STUDENT',
  overrides: Partial<MockUser> = {},
): Promise<MockUser> {
  const id = overrides.id ?? '11111111-1111-4111-8111-111111111111';
  const email = overrides.email ?? `${role.toLowerCase()}@example.test`;
  const fullName =
    overrides.fullName ??
    (role === 'STUDENT'
      ? 'Alex Student'
      : role === 'PLACEMENT_FACULTY'
        ? 'Dr. Sarah Faculty'
        : 'Chief Admin');

  const permissions =
    overrides.permissions ??
    (role === 'STUDENT'
      ? STUDENT_PERMISSIONS
      : role === 'PLACEMENT_FACULTY'
        ? FACULTY_PERMISSIONS
        : ADMIN_PERMISSIONS);

  const user: MockUser = {
    id,
    email,
    fullName,
    roles: [role],
    permissions,
  };

  const exp = Math.floor(Date.now() / 1000) + 7200;
  const jwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(
    JSON.stringify({ sub: id, exp, role, email }),
  ).toString('base64url')}.test-signature`;

  await page.addInitScript(
    ({ jwt, exp, user }) => {
      localStorage.setItem('supabase_access_token', jwt);
      localStorage.setItem(
        'sb-browser-test-auth-token',
        JSON.stringify({
          access_token: jwt,
          refresh_token: 'test-refresh-token',
          expires_at: exp,
          expires_in: 7200,
          token_type: 'bearer',
          user,
        }),
      );
    },
    { jwt, exp, user },
  );

  return user;
}
