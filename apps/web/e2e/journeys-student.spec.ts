import { expect, test } from '@playwright/test';
import { mockSession } from './helpers/auth';

test.describe('Student Critical Journeys (1-10)', () => {
  // ── Journey 1: Student Sign-in ──────────────────────────────────────────
  test('Journey 1: Student sign-in flow', async ({ page }) => {
    await page.route('**/api/v1/auth/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: '11111111-1111-4111-8111-111111111111',
              email: 'student@example.test',
              fullName: 'Alex Student',
              roles: ['STUDENT'],
              permissions: ['opportunities.view'],
            },
            session: { access_token: 'mock-jwt-token' },
          },
        }),
      });
    });

    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your password/i)).toBeVisible();

    await page.getByLabel(/email address/i).fill('student@example.test');
    await page.getByPlaceholder(/enter your password/i).fill('Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  // ── Journey 2: Complete Profile ─────────────────────────────────────────
  test('Journey 2: Complete profile', async ({ page }) => {
    const user = await mockSession(page, 'STUDENT');

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes('/students/me/completion')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              percentage: 85,
              isComplete: true,
              categories: [
                {
                  id: 'cat-1',
                  name: 'Academic Profile',
                  isCompleted: true,
                  score: 30,
                  weight: 30,
                  detail: 'CGPA & Roll No. verified',
                },
              ],
              missingSections: [],
            },
          }),
        });
      }

      if (url.pathname.includes('/students/me')) {
        if (route.request().method() === 'PUT') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: user.id,
                fullName: 'Alex Student',
                rollNumber: 'CS2026001',
                cgpa: 8.9,
                graduationYear: 2026,
                departmentId: 'dept-1',
              },
            }),
          });
        }
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: user.id,
              fullName: 'Alex Student',
              email: user.email,
              rollNumber: 'CS2026001',
              cgpa: 8.9,
              graduationYear: 2026,
              skills: ['TypeScript', 'React'],
              department: { name: 'Computer Science & Engineering', code: 'CSE' },
              isPlacementEligible: true,
            },
          }),
        });
      }

      if (url.pathname.includes('/departments')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [{ id: 'dept-1', name: 'Computer Science & Engineering', code: 'CSE' }],
          }),
        });
      }

      if (url.pathname.includes('/batches')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [{ id: 'batch-1', graduationYear: 2026, isActive: true }],
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/dashboard/profile');
    await expect(page.getByRole('heading', { name: /Alex Student|Student Profile/i })).toBeVisible();
    await expect(page.getByText('Alex Student').first()).toBeVisible();
  });

  // ── Journey 3: Create Resume ────────────────────────────────────────────
  test('Journey 3: Create resume', async ({ page }) => {
    const user = await mockSession(page, 'STUDENT');

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes('/resumes')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'resume-1',
                title: 'Software Engineer Resume',
                templateId: 'modern',
                isPrimary: true,
                version: 1,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                content: {
                  isUploaded: false,
                  summary: 'Fullstack Developer',
                  personalInfo: { fullName: 'Alex Student', email: 'student@example.test' },
                  skills: ['TypeScript', 'React'],
                  projects: [],
                  experience: [],
                  education: [],
                },
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

    await page.goto('/dashboard/resumes');
    await expect(page.getByRole('heading', { name: /my resumes/i })).toBeVisible();
    await expect(page.getByText('Software Engineer Resume')).toBeVisible();
    await expect(page.getByText('Fullstack Developer')).toBeVisible();
  });

  // ── Journey 4: Browse Opportunity ───────────────────────────────────────
  test('Journey 4: Browse opportunity', async ({ page }) => {
    const user = await mockSession(page, 'STUDENT');

    const oppId = 'opp-1111-2222';
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes('/opportunities')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: oppId,
                title: 'Associate Cloud Engineer',
                company: { name: 'Google Cloud' },
                type: 'job',
                workMode: 'hybrid',
                location: 'Bengaluru',
                status: 'published',
                isEligible: true,
                skills: [{ skillId: 's-1', name: 'Python' }],
              },
            ],
            meta: { totalItems: 1, page: 1, pageSize: 20 },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/dashboard/opportunities');
    await expect(page.getByText('Associate Cloud Engineer')).toBeVisible();
    await expect(page.getByText('Google Cloud')).toBeVisible();
    await expect(page.getByText(/eligible/i).first()).toBeVisible();
  });

  // ── Journey 5: Save Opportunity ─────────────────────────────────────────
  test('Journey 5: Save opportunity', async ({ page }) => {
    const user = await mockSession(page, 'STUDENT');

    const oppId = 'opp-save-123';
    let saveCalled = false;

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes('/saved-opportunities')) {
        saveCalled = true;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { saved: true } }),
        });
      }

      if (url.pathname.includes('/opportunities')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: oppId,
                title: 'Systems Architect Intern',
                company: { name: 'DeepMind' },
                type: 'internship',
                workMode: 'remote',
                status: 'published',
                isEligible: true,
                isSaved: false,
                skills: [],
              },
            ],
            meta: { totalItems: 1, page: 1, pageSize: 20 },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/dashboard/opportunities');
    await expect(page.getByText('Systems Architect Intern')).toBeVisible();
    const bookmarkBtn = page.locator('button[title*="Save"]').first();
    await expect(bookmarkBtn).toBeVisible();
    await bookmarkBtn.click();
    expect(saveCalled).toBe(true);
  });

  // ── Journey 6: Apply to Opportunity ─────────────────────────────────────
  test('Journey 6: Apply to opportunity', async ({ page }) => {
    const user = await mockSession(page, 'STUDENT');

    const oppId = 'opp-apply-456';
    let applicationSubmitted = false;

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.endsWith(`/opportunities/${oppId}`)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: oppId,
              title: 'Frontend Platform Engineer',
              company: { name: 'Vercel' },
              description: 'Build fast next-generation web platforms',
              type: 'job',
              workMode: 'remote',
              status: 'published',
              isEligible: true,
              skills: [],
              eligibility: [],
              applicationCount: 12,
            },
          }),
        });
      }

      if (url.pathname.endsWith('/applications') && route.request().method() === 'POST') {
        applicationSubmitted = true;
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'app-999', status: 'applied' },
          }),
        });
      }

      if (url.pathname.includes('/applications')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [], meta: { totalItems: 0 } }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto(`/dashboard/opportunities/${oppId}`);
    await expect(page.getByText('Frontend Platform Engineer')).toBeVisible();
    await expect(page.getByText('Vercel')).toBeVisible();

    const applyBtn = page.getByRole('button', { name: /mark as applied/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();
    expect(applicationSubmitted).toBe(true);
  });

  // ── Journey 7: View Application Status ──────────────────────────────────
  test('Journey 7: View application status', async ({ page }) => {
    const user = await mockSession(page, 'STUDENT');

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes('/applications')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'app-1',
                status: 'under_review',
                createdAt: new Date().toISOString(),
                opportunity: {
                  id: 'opp-1',
                  title: 'Staff Security Engineer',
                  company: { name: 'Cloudflare' },
                  type: 'job',
                },
                resume: { title: 'Security Resume' },
              },
            ],
            meta: { totalItems: 1, page: 1, pageSize: 20 },
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/dashboard/applications');
    await expect(page.getByRole('heading', { name: /application tracker/i })).toBeVisible();
    await expect(page.getByText('Staff Security Engineer')).toBeVisible();
    await expect(page.getByText('In Review')).toBeVisible();
  });

  // ── Journey 8: Take Mock Test ───────────────────────────────────────────
  test('Journey 8: Take mock test', async ({ page }) => {
    const user = await mockSession(page, 'STUDENT');

    const testId = 'test-prep-1';
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes(`/tests/${testId}/start`)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              testId,
              title: 'Data Structures & Algorithms Diagnostic',
              attemptId: 'att-101',
              durationMinutes: 30,
              startedAt: new Date().toISOString(),
              questions: [
                {
                  id: 'q-1',
                  questionText: 'What is the average time complexity of quicksort?',
                  options: ['O(N log N)', 'O(N^2)', 'O(log N)', 'O(1)'],
                  type: 'multiple_choice',
                },
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

    await page.goto(`/dashboard/preparation/tests/${testId}/take`);
    await expect(page.getByText(/data structures & algorithms/i)).toBeVisible();
    await expect(page.getByText(/what is the average time complexity/i)).toBeVisible();
    await expect(page.getByText('O(N log N)')).toBeVisible();
  });

  // ── Journey 9: View Test Result ─────────────────────────────────────────
  test('Journey 9: View test result', async ({ page }) => {
    const user = await mockSession(page, 'STUDENT');

    const attemptId = 'attempt-101';
    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes(`/attempts/${attemptId}/result`)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: attemptId,
              testTitle: 'Algorithms Mastery Test',
              score: 85,
              totalMarks: 100,
              passingMarks: 60,
              timeSpentSeconds: 1200,
              isPassed: true,
              submittedAt: new Date().toISOString(),
              questions: [
                {
                  questionId: 'q-1',
                  questionText: 'What is quicksort?',
                  isCorrect: true,
                  awardedMarks: 10,
                  maxMarks: 10,
                  options: ['O(N log N)', 'O(N^2)'],
                  selectedIndex: 0,
                  correctAnswerIndex: 0,
                  explanation: 'Quicksort average time complexity is O(N log N).',
                },
              ],
              topicAccuracies: [
                {
                  topic: 'Trees & Graphs',
                  accuracyPercentage: 90,
                  correctQuestions: 9,
                  totalQuestions: 10,
                },
              ],
              weakCategories: [],
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

    await page.goto(`/dashboard/preparation/attempts/${attemptId}/result`);
    await expect(page.getByRole('heading', { name: /algorithms mastery test/i })).toBeVisible();
    await expect(page.getByText(/85%/).first()).toBeVisible();
  });

  // ── Journey 10: Follow Career Roadmap ───────────────────────────────────
  test('Journey 10: Follow career roadmap', async ({ page }) => {
    const user = await mockSession(page, 'STUDENT');

    await page.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());

      if (url.pathname.includes('/auth/sync')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: user }),
        });
      }

      if (url.pathname.includes('/career-paths')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'career-fe-1',
                title: 'Fullstack Web Engineer',
                description: 'End-to-end modern web applications',
                isActive: true,
                stages: [
                  {
                    id: 'stg-1',
                    title: 'Phase 1: React Foundations',
                    description: 'Modern frontend concepts',
                    isCompleted: true,
                    skills: [],
                    skillNames: {},
                    activities: [],
                    resources: [],
                  },
                  {
                    id: 'stg-2',
                    title: 'Phase 2: Node.js & Distributed Systems',
                    description: 'Backend services',
                    isCompleted: false,
                    skills: [],
                    skillNames: {},
                    activities: [],
                    resources: [],
                  },
                ],
              },
            ],
          }),
        });
      }

      if (url.pathname.includes('/roadmaps/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'rdmp-1',
                targetRole: 'Fullstack Web Engineer',
                progressPercent: 50,
                status: 'active',
                startedAt: new Date().toISOString(),
                currentStageId: 'stg-2',
                stages: [
                  {
                    id: 'stg-1',
                    title: 'Phase 1: React Foundations',
                    description: 'Modern frontend concepts',
                    isCompleted: true,
                    skills: [],
                    skillNames: {},
                    activities: [],
                    resources: [],
                  },
                  {
                    id: 'stg-2',
                    title: 'Phase 2: Node.js & Distributed Systems',
                    description: 'Backend services',
                    isCompleted: false,
                    skills: [],
                    skillNames: {},
                    activities: [],
                    resources: [],
                  },
                ],
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

    await page.goto('/dashboard/careers');
    await expect(page.getByRole('heading', { name: /Find your career direction/i })).toBeVisible();
    await expect(page.getByText('Fullstack Web Engineer')).toBeVisible();

    await page.goto('/dashboard/roadmap');
    await expect(page.getByRole('heading', { name: /my roadmap/i })).toBeVisible();
    await expect(page.getByText('Phase 1: React Foundations')).toBeVisible();
  });
});
