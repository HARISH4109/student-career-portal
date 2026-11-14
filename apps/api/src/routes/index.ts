import { Router } from 'express';

import { academicRouter } from '@/modules/academic/academic.routes';
import { analyticsRouter } from '@/modules/analytics/analytics.routes';
import { applicationsRouter } from '@/modules/applications/application.routes';
import { auditRouter } from '@/modules/audit/audit.routes';
import { careerPathsRouter, resourcesRouter, roadmapsRouter, skillGapRouter } from '@/modules/career/career.routes';
import { companiesRouter } from '@/modules/companies/company.routes';
import { healthController, healthRouter } from '@/modules/health/health.routes';
import { authRouter } from '@/modules/identity/auth/auth.routes';
import { userManagementRouter } from '@/modules/identity/user-management/user-management.routes';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requireRole } from '@/middlewares/require-role.middleware';
import { noticesRouter } from '@/modules/notices/notices.routes';
import { notificationsRouter } from '@/modules/notifications/notifications.routes';
import { opportunityDraftRouter } from '@/modules/opportunities/opportunity-draft.routes';
import { opportunitiesRouter } from '@/modules/opportunities/opportunity.routes';
import {
  attemptsRouter,
  mockInterviewsRouter,
  preparationAnalyticsRouter,
  testsRouter,
} from '@/modules/preparation/preparation.routes';
import { resumeRouter } from '@/modules/resume/resume.routes';
import { savedOpportunitiesRouter } from '@/modules/saved-opportunities/saved-opportunity.routes';
import { skillsRouter } from '@/modules/skills/skills.routes';
import { studentRouter } from '@/modules/student/student.routes';


/**
 * Single mount point for all module routers. As modules are built out
 * (Phase 1: auth, Phase 2: student/resume, Phase 3: opportunities/applications, Phase 5: preparation)
 * they register here — this file should never contain route *logic*, only composition.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/admin/users', userManagementRouter);
apiRouter.use('/admin/audit-logs', auditRouter);
apiRouter.use('/admin/health', requireAuth, requireRole('ADMIN'), healthController.checkDetailed);
apiRouter.use('/academic', academicRouter);
apiRouter.use('/skills', skillsRouter);
apiRouter.use('/students', studentRouter);
apiRouter.use('/resumes', resumeRouter);
apiRouter.use('/opportunities', opportunitiesRouter);
apiRouter.use('/opportunity-drafts', opportunityDraftRouter);
apiRouter.use('/applications', applicationsRouter);
apiRouter.use('/saved-opportunities', savedOpportunitiesRouter);
apiRouter.use('/companies', companiesRouter);
apiRouter.use('/tests', testsRouter);
apiRouter.use('/attempts', attemptsRouter);
apiRouter.use('/mock-interviews', mockInterviewsRouter);
apiRouter.use('/preparation/analytics', preparationAnalyticsRouter);
apiRouter.use('/career-paths', careerPathsRouter);
apiRouter.use('/roadmaps', roadmapsRouter);
apiRouter.use('/resources', resourcesRouter);
apiRouter.use('/skill-gap', skillGapRouter);
apiRouter.use('/notices', noticesRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/analytics', analyticsRouter);


