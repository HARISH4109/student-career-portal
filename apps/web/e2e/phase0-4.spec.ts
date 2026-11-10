import { expect, test } from '@playwright/test';

test('guest is redirected to login without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/dashboard/opportunities');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
  expect(errors).toEqual([]);
});

test('login displays the API error', async ({ page }) => {
  await page.route('**/api/v1/auth/signin', (route) => route.fulfill({
    status: 401, contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }),
  }));
  await page.goto('/login');
  await page.getByLabel('Email address').fill('student@example.test');
  await page.getByPlaceholder('Enter your password').fill('incorrect-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText('Invalid email or password', { exact: true })).toBeVisible();
});

test('failed draft save prevents approval and preserves the error message', async ({ page }) => {
  const id = '11111111-1111-4111-8111-111111111111';
  const user = { id, email: 'faculty@example.test', fullName: 'Test Faculty', roles: ['PLACEMENT_FACULTY'], permissions: ['opportunities.create', 'opportunities.publish', 'opportunities.view'] };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const jwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: id, exp })).toString('base64url')}.test-signature`;
  await page.addInitScript(({ jwt, exp, user }) => {
    localStorage.setItem('sb-browser-test-auth-token', JSON.stringify({ access_token: jwt, refresh_token: 'test-refresh', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }));
  }, { jwt, exp, user });
  let approvals = 0;
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    let status = 200;
    let body: unknown = { success: true, data: user };
    if (url.pathname.endsWith('/approve')) { approvals++; }
    else if (route.request().method() === 'PATCH') {
      status = 422;
      body = { success: false, error: { code: 'VALIDATION_ERROR', message: 'Draft save rejected by test server' } };
    } else if (url.pathname.includes('/opportunity-drafts/')) {
      body = { success: true, data: {
        id, extractionRunId: id, status: 'pending_review', title: 'Platform Engineer', companyName: 'Test Company',
        type: 'job', workMode: 'remote', description: 'Build reliable services', extractedSkills: ['TypeScript'],
        extractedEligibility: { minCgpa: 7, departmentCodes: [], allowedBatches: [], description: null },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        extractionRun: { id, sourceId: id, status: 'completed', confidenceScore: 90 },
        source: { id, sourceType: 'text', rawContent: 'Platform engineer role', status: 'processed' },
      } };
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto(`/dashboard/opportunities/drafts/${id}/review`);
  await page.getByRole('button', { name: 'Approve & Publish Opportunity' }).click();
  await expect(page.getByText('Draft save rejected by test server')).toBeVisible();
  expect(approvals).toBe(0);
});
