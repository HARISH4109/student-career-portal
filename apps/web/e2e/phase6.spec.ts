import { expect, test, type Page } from '@playwright/test';
const id = '11111111-1111-4111-8111-111111111111';
const skill = '22222222-2222-4222-8222-222222222222';
async function session(page: Page, staff = false) {
  const user = {
    id,
    email: 'phase6@example.test',
    fullName: 'Phase Six',
    roles: [staff ? 'PLACEMENT_FACULTY' : 'STUDENT'],
    permissions: [
      'resources.view',
      ...(staff
        ? ['career_paths.manage', 'resources.manage']
        : ['roadmaps.manage_own', 'skill_gap.analyze_own']),
    ],
  };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: id, exp })).toString('base64url')}.test-signature`;
  await page.addInitScript(
    ({ jwt, exp, user }) => {
      localStorage.setItem(
        'sb-browser-test-auth-token',
        JSON.stringify({
          access_token: jwt,
          refresh_token: 'test-refresh',
          expires_at: exp,
          expires_in: 3600,
          token_type: 'bearer',
          user,
        }),
      );
    },
    { jwt, exp, user },
  );
  return user;
}
test('staff creates a published career with a required skill and project', async ({ page }) => {
  const user = await session(page, true);
  let saved: unknown;
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = user;
    if (url.pathname.endsWith('/skills')) data = [{ id: skill, name: 'React' }];
    if (url.pathname.endsWith('/resources')) data = [];
    if (url.pathname.endsWith('/career-paths')) {
      data = [];
      if (route.request().method() === 'POST') {
        saved = route.request().postDataJSON() as unknown;
        data = { id, ...(saved as object) };
      }
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });
  });
  await page.goto('/dashboard/careers/manage');
  await page.getByLabel('Career title', { exact: true }).fill('Frontend Developer');
  await page.getByRole('button', { name: 'Add stage', exact: true }).click();
  await page.getByLabel('Stage title').fill('Foundations');
  await page.getByLabel('Required skills', { exact: true }).selectOption([skill]);
  await page.getByLabel('Published career').check();
  await page.getByRole('button', { name: 'Add activity', exact: true }).click();
  await page.getByLabel('Activity title').fill('Build a portfolio');
  await page.getByLabel('Activity instructions').fill('Create an accessible site');
  await page.getByRole('button', { name: 'Save career', exact: true }).click();
  await expect(page.getByText('Career saved.', { exact: true })).toBeVisible();
  expect(saved).toMatchObject({
    title: 'Frontend Developer',
    isActive: true,
    stages: [{ skills: [{ skillId: skill, proficiency: 'intermediate' }] }],
  });
});
test('student starts a career, completes a stage and analyzes current skills on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const user = await session(page);
  let started = false;
  let completed = false;
  const stage = {
    id: skill,
    title: 'Foundations',
    description: 'Build the basics',
    isActive: true,
    skills: [],
    resourceIds: [],
    activities: [],
    skillNames: {},
    resources: [],
    isCompleted: false,
    startedAt: null,
    completedAt: null,
  };
  const career = {
    id,
    title: 'Frontend Developer',
    description: 'Build accessible interfaces',
    isActive: true,
    stages: [stage],
  };
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = user;
    if (url.pathname.includes('/career-paths'))
      data = url.pathname.endsWith('/career-paths') ? [career] : career;
    if (url.pathname.endsWith('/skills')) data = [];
    const map = () => ({
      id,
      careerPathId: id,
      targetRole: career.title,
      status: completed ? 'completed' : 'active',
      progressPercent: completed ? 100 : 0,
      currentStageId: completed ? null : skill,
      startedAt: '2026-11-02T00:00:00Z',
      completedAt: null,
      stages: [{ ...stage, isCompleted: completed }],
    });
    if (url.pathname.endsWith('/roadmaps') && route.request().method() === 'POST') {
      started = true;
      data = map();
    }
    if (url.pathname.endsWith('/roadmaps/me')) data = started ? [map()] : [];
    if (url.pathname.includes('/stages/')) {
      completed = true;
      data = map();
    }
    if (url.pathname.endsWith('/skill-gap/me')) data = [];
    if (url.pathname.endsWith('/skill-gap') && route.request().method() === 'POST')
      data = {
        id,
        targetRole: career.title,
        createdAt: '2026-11-02T00:00:00Z',
        skills: [],
        optionalSkills: [],
        unclassifiedTopics: [],
      };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data, meta: { totalPages: 1 } }),
    });
  });
  await page.goto(`/dashboard/careers/${id}`);
  await page.getByRole('button', { name: 'Start this roadmap' }).click();
  await expect(page.getByRole('heading', { name: 'My roadmap', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Complete stage', exact: true }).click();
  await expect(page.getByText('100% complete · completed')).toBeVisible();
  await page.getByRole('link', { name: 'Reanalyze skills', exact: true }).click();
  await page.getByRole('button', { name: 'Analyze current skills' }).click();
  await expect(page.getByText('No required skills are linked to this goal yet.')).toBeVisible();
  expect(started && completed).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test('career screens match preparation styling, preserve sidebar order, and fit mobile', async ({
  page,
}, testInfo) => {
  const user = await session(page);
  const career = {
    id,
    title: 'Frontend Developer',
    description: 'Build accessible, responsive interfaces with a practical learning path.',
    isActive: true,
    stages: [
      {
        title: 'Foundations',
        isActive: true,
        skills: [{ skillId: skill, proficiency: 'intermediate' }],
        resourceIds: [skill],
        activities: [
          {
            type: 'project',
            title: 'Build a portfolio',
            description: 'Apply your skills to a real project.',
          },
        ],
      },
    ],
  };
  const resource = {
    id: skill,
    title: 'React: The complete learning guide',
    description: 'Learn component design and state management through practical examples.',
    type: 'documentation',
    difficulty: 'beginner',
    url: 'https://react.dev/learn',
    progress: { status: 'completed', progressPercent: 100 },
    skillIds: [skill],
    careerPathIds: [id],
  };
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = user;
    if (url.pathname.includes('/career-paths'))
      data = url.pathname.endsWith('/career-paths') ? [career] : career;
    if (url.pathname.endsWith('/skills')) data = [{ id: skill, name: 'React' }];
    if (url.pathname.endsWith('/resources')) data = [resource];
    if (url.pathname.endsWith('/roadmaps/me'))
      data = [
        {
          id,
          targetRole: 'Frontend Developer',
          careerPathId: id,
          status: 'active',
          progressPercent: 0,
          startedAt: '2026-11-02T00:00:00Z',
          completedAt: null,
          currentStageId: skill,
          stages: [
            {
              ...career.stages[0],
              id: skill,
              skillNames: { [skill]: 'React' },
              resources: [{ ...resource, progressStatus: 'completed' }],
              isCompleted: false,
            },
          ],
        },
      ];
    if (url.pathname.endsWith('/skill-gap/me')) data = [];
    if (url.pathname.endsWith('/skill-gap'))
      data = {
        id,
        targetRole: career.title,
        createdAt: '2026-11-02T00:00:00Z',
        skills: [
          {
            skillId: skill,
            name: 'React',
            status: 'missing',
            requiredProficiency: 'intermediate',
            currentProficiency: null,
            priority: 1,
            assessment: null,
            actions: [
              {
                type: 'resource',
                title: resource.title,
                url: resource.url,
                reason: 'React is missing from your profile for Frontend Developer.',
              },
            ],
          },
        ],
        optionalSkills: [],
        unclassifiedTopics: [],
      };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data,
        meta: { page: 1, totalPages: 1, totalItems: 1 },
      }),
    });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dashboard/careers');
  await expect(page.getByRole('link', { name: 'Explore path' })).toBeVisible();
  const sidebar = page.locator('aside').first();
  await expect(sidebar.getByRole('link').first()).toHaveText('Dashboard');
  const links = (await sidebar.getByRole('link').allTextContents()).map((text) => text.trim());
  expect(links.slice(-4)).toEqual([
    'Career Paths',
    'My Roadmap',
    'Learning Resources',
    'Skill Gaps',
  ]);
  expect(links.indexOf('Preparation')).toBeLessThan(links.indexOf('Career Paths'));
  await page.screenshot({ path: testInfo.outputPath('careers-desktop.png'), fullPage: true });
  for (const [path, title] of [
    ['roadmap', 'My roadmap'],
    ['resources', 'Learning resources'],
    ['skill-gap', 'Understand your skill gaps'],
  ] as const) {
    await page.goto(`/dashboard/${path}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    if (path === 'roadmap')
      await expect(page.getByRole('button', { name: 'Resource completed' })).toBeDisabled();
    if (path === 'skill-gap') {
      await page.getByLabel('Target career').selectOption(id);
      await page.getByRole('button', { name: 'Analyze current skills' }).click();
      await expect(page.getByText('React · Missing')).toBeVisible();
    }
    await page.screenshot({ path: testInfo.outputPath(`${path}-desktop.png`), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${path}-mobile.png`), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const mobile = page.locator('aside').filter({ visible: true });
  await expect(mobile.getByRole('link').first()).toHaveText('Dashboard');
  await mobile.getByRole('link', { name: 'Skill Gaps', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveCount(0);
});

test('faculty tabs hide student routes and surface server validation errors', async ({
  page,
}, testInfo) => {
  const user = await session(page, true);
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = user;
    if (url.pathname.endsWith('/skills')) data = [];
    if (url.pathname.endsWith('/resources') || url.pathname.endsWith('/career-paths')) data = [];
    if (route.request().method() === 'POST' && url.pathname.endsWith('/career-paths')) {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Published careers need active stages with required skills',
          },
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });
  });
  await page.goto('/dashboard/careers/manage');
  const tabs = page.getByRole('navigation', { name: 'Career preparation' });
  await expect(tabs.getByRole('link', { name: 'My roadmap' })).toHaveCount(0);
  await expect(tabs.getByRole('link', { name: 'Skill gaps' })).toHaveCount(0);
  await expect(tabs.getByRole('link', { name: 'Career paths' })).toHaveCount(0);
  await expect(tabs.getByRole('link', { name: 'Learning resources' })).toHaveCount(0);
  await expect(tabs.getByRole('link', { name: 'Manage catalog' })).toHaveCount(1);
  await page.getByLabel('Career title', { exact: true }).fill('New career');
  await page.getByLabel('Published career').check();
  await page.getByRole('button', { name: 'Save career', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Published careers need active stages');
  await page.screenshot({ path: testInfo.outputPath('management-desktop.png'), fullPage: true });
});
