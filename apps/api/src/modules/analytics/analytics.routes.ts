import { Router } from 'express';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';
import { AnalyticsController } from './analytics.controller';

export const analyticsRouter = Router();
const controller = new AnalyticsController();

analyticsRouter.use(requireAuth);

analyticsRouter.get('/student', requirePermission('analytics.view_own'), controller.getStudentAnalytics);
analyticsRouter.get('/faculty', requirePermission('analytics.view_all'), controller.getFacultyAnalytics);
analyticsRouter.get('/admin', requirePermission('admin.system_config'), controller.getAdminAnalytics);
analyticsRouter.post('/snapshots/generate', requirePermission('admin.system_config'), controller.generateSnapshots);

