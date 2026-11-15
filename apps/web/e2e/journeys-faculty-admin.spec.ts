import { expect, test } from '@playwright/test';
import { mockSession } from './helpers/auth';

test.describe('Faculty & Admin Critical Journeys (11, 13-16)', () => {
  // ── Journey 11: Faculty Sign-in ─────────────────────────────────────────
  test('Journey 11: Faculty sign-in flow', async ({ page }) => {
    await page.route('**/api/v1/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: '22222222-2222-4222-8222-222222222222',
              email: 'faculty@univ.test',
              fullName: 'Dr. Sarah Faculty',
              roles: ['PLACEMENT_FACULTY'],
              permissions: ['opportunities.create', 'opportunities.publish'],
            },
            session: { access_token: 'mock-faculty-jwt' },
          },
        }),
      });
    });

    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel(/email address/i).fill('faculty@univ.test');
    await page.getByPlaceholder(/enter your password/i).fill('FacultyPass123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  // ── Journey 13: Review AI Draft ─────────────────────────────────────────
  test('Journey 13: Review existing AI extracted draft', async ({ page }) => {
    const user = await mockSession(page, 'PLACEMENT_FACULTY');

    const draftId = 'draft-ai-123';
    let draftPatched = false;

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes(`/opportunity-drafts/${draftId}`)) {
        if (route.request().method() === 'PATCH') {
          draftPatched = true;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { id: draftId, title: 'Senior AI Research Engineer' },
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: draftId,
              status: 'pending_review',
              title: 'AI Research Engineer',
              companyName: 'Anthropic Labs',
              type: 'job',
              workMode: 'hybrid',
              description: 'Conduct foundational frontier LLM research and evaluations.',
              extractedSkills: ['PyTorch', 'Transformer Architecture'],
              extractedEligibility: {
                minCgpa: 8.5,
                departmentCodes: ['CSE', 'ECE'],
                allowedBatches: ['2026'],
              },
              extractionRun: {
                id: 'run-1',
                status: 'completed',
                confidenceScore: 94,
              },
              source: {
                id: 'src-1',
                sourceType: 'text',
                rawContent: 'Sample ingested JD raw content',
              },
            },
          }),
        });
      }

      if (url.pathname.endsWith('/skills')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      }

      if (url.pathname.endsWith('/companies')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto(`/dashboard/opportunities/drafts/${draftId}/review`);
    await expect(page.getByRole('heading', { name: /Review AI Agent Extraction Draft/i })).toBeVisible();
    await expect(page.locator('input[value="AI Research Engineer"]')).toBeVisible();
    await expect(page.locator('input[value="Anthropic Labs"]')).toBeVisible();
    await expect(page.getByText('PyTorch')).toBeVisible();
  });

  // ── Journey 14: Publish Opportunity ─────────────────────────────────────
  test('Journey 14: Publish opportunity', async ({ page }) => {
    const user = await mockSession(page, 'PLACEMENT_FACULTY');

    const draftId = 'draft-publish-456';
    let publishApproved = false;

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes(`/opportunity-drafts/${draftId}/approve`)) {
        publishApproved = true;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              opportunityId: 'opp-published-789',
              status: 'published',
            },
          }),
        });
      }

      if (url.pathname.includes(`/opportunity-drafts/${draftId}`)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: draftId,
              status: 'pending_review',
              title: 'Principal Distributed Systems Engineer',
              companyName: 'Stripe',
              type: 'job',
              workMode: 'remote',
              description: 'Architect resilient global payments platform.',
              extractedSkills: ['Go', 'Kubernetes'],
              extractedEligibility: { minCgpa: 8.0, departmentCodes: ['CSE'] },
              extractionRun: { id: 'run-pub', confidenceScore: 98 },
              source: { id: 'src-pub', sourceType: 'text' },
            },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto(`/dashboard/opportunities/drafts/${draftId}/review`);
    await expect(page.getByRole('heading', { name: /Review AI Agent Extraction Draft/i })).toBeVisible();
    await expect(page.locator('input[value="Principal Distributed Systems Engineer"]')).toBeVisible();
    await expect(page.locator('input[value="Stripe"]')).toBeVisible();

    const approveBtn = page.getByRole('button', { name: /Approve & Publish Opportunity/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();
    await expect.poll(() => publishApproved).toBe(true);
  });

  // ── Journey 15: View Analytics ──────────────────────────────────────────
  test('Journey 15: View student and application analytics', async ({ page }) => {
    const user = await mockSession(page, 'PLACEMENT_FACULTY');

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes('/analytics')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              totalStudents: 1250,
              placedStudents: 980,
              activeOpportunities: 45,
              totalApplications: 3420,
              placementRate: 78.4,
              averageCgpa: 8.2,
              departmentBreakdown: [
                { department: 'Computer Science', total: 400, placed: 360 },
                { department: 'Electronics', total: 350, placed: 280 },
              ],
            },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/dashboard/analytics');
    await expect(page.getByRole('heading', { name: /analytics/i }).first()).toBeVisible();
  });

  // ── Journey 16: Admin User Management & Audit Inspection ─────────────────
  test('Journey 16: Admin user management & audit log inspection', async ({ page }) => {
    const user = await mockSession(page, 'ADMIN');

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes('/users') || url.pathname.includes('/user-management')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'usr-1',
                email: 'student.one@univ.test',
                fullName: 'Alice Johnson',
                isActive: true,
                roles: ['STUDENT'],
                createdAt: new Date().toISOString(),
              },
              {
                id: 'usr-2',
                email: 'faculty.one@univ.test',
                fullName: 'Prof. Davis',
                isActive: true,
                roles: ['PLACEMENT_FACULTY'],
                createdAt: new Date().toISOString(),
              },
            ],
            meta: { total: 2, page: 1, limit: 10 },
          }),
        });
      }

      if (url.pathname.includes('/audit')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'aud-1',
                action: 'OPPORTUNITY_PUBLISHED',
                entity: 'opportunity',
                userId: 'usr-2',
                createdAt: new Date().toISOString(),
              },
            ],
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/dashboard/admin');
    await expect(page.getByRole('heading', { name: /admin/i }).first()).toBeVisible();
    await expect(page.getByText('Alice Johnson')).toBeVisible();
    await expect(page.getByText('Prof. Davis')).toBeVisible();
  });
});
