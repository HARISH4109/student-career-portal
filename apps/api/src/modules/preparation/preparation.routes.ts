import { Router } from 'express';

import { PreparationController } from './preparation.controller';

import { aiRateLimiter } from '@/middlewares/ai-rate-limit.middleware';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new PreparationController();

export const testsRouter = Router();
export const attemptsRouter = Router();
export const mockInterviewsRouter = Router();
export const preparationAnalyticsRouter = Router();

// All preparation routes require authentication
testsRouter.use(requireAuth);
attemptsRouter.use(requireAuth);
mockInterviewsRouter.use(requireAuth);
preparationAnalyticsRouter.use(requireAuth);

// ── Tests Catalog & Authoring Routes ─────────────────────────────────────

testsRouter.get('/', controller.getTests);
testsRouter.post('/', requirePermission('mock_tests.manage'), controller.createTest);
testsRouter.get('/:id', controller.getTestById);
testsRouter.get('/:id/author', requirePermission('mock_tests.manage'), controller.getTestAuthorDetails);
testsRouter.patch('/:id', requirePermission('mock_tests.manage'), controller.updateTest);
testsRouter.delete('/:id', requirePermission('mock_tests.manage'), controller.deleteTest);

// Section routes
testsRouter.post('/:id/sections', requirePermission('mock_tests.manage'), controller.addSection);
testsRouter.patch('/:id/sections/:sectionId', requirePermission('mock_tests.manage'), controller.updateSection);
testsRouter.delete('/:id/sections/:sectionId', requirePermission('mock_tests.manage'), controller.deleteSection);

// Question routes
testsRouter.post('/:id/questions', requirePermission('mock_tests.manage'), controller.addQuestion);
testsRouter.patch('/:id/questions/:questionId', requirePermission('mock_tests.manage'), controller.updateQuestion);
testsRouter.delete('/:id/questions/:questionId', requirePermission('mock_tests.manage'), controller.deleteQuestion);

// Test Taking
testsRouter.post('/:id/start', requirePermission('mock_tests.attempt'), controller.startTest);
testsRouter.post('/:id/submit', requirePermission('mock_tests.attempt'), controller.submitTestByTestId);

// Faculty Analytics
testsRouter.get('/:id/analytics', requirePermission('mock_tests.manage'), controller.getFacultyTestAnalytics);

// ── Attempt Routes ───────────────────────────────────────────────────────

attemptsRouter.get('/me', requirePermission('mock_tests.view_results_own'), controller.getMyAttempts);
attemptsRouter.post('/:id/autosave', requirePermission('mock_tests.attempt'), controller.autosaveAnswer);
attemptsRouter.post('/:id/submit', requirePermission('mock_tests.attempt'), controller.submitTestByAttempt);
attemptsRouter.get('/:id/result', controller.getAttemptResult);

// ── Preparation Analytics Routes ─────────────────────────────────────────

preparationAnalyticsRouter.get('/me', requirePermission('mock_tests.view_results_own'), controller.getMyAnalytics);

// ── Mock Interview Tracks & Templates ──────────────────────────────────

mockInterviewsRouter.get('/templates', controller.getInterviewTemplates);
mockInterviewsRouter.post('/templates', requirePermission('mock_tests.manage'), controller.createInterviewTemplate);
mockInterviewsRouter.patch('/templates/:id', requirePermission('mock_tests.manage'), controller.updateInterviewTemplate);
mockInterviewsRouter.delete('/templates/:id', requirePermission('mock_tests.manage'), controller.deleteInterviewTemplate);

// ── Mock Interview Routes ────────────────────────────────────────────────

mockInterviewsRouter.post('/', requirePermission('mock_interviews.schedule_own'), aiRateLimiter, controller.scheduleMockInterview);
mockInterviewsRouter.get('/me', requirePermission('mock_interviews.view_own'), controller.getMyInterviews);
mockInterviewsRouter.get('/:id', controller.getInterviewById);
mockInterviewsRouter.post('/:id/submit', requirePermission('mock_interviews.schedule_own'), aiRateLimiter, controller.submitAIInterviewAnswers);
mockInterviewsRouter.delete('/:id', controller.deleteInterview);
