import { Router } from 'express';

import { AuditController } from './audit.controller';
import { auditService } from './audit.service';
import { FailedAiJobsController } from './failed-ai-jobs.controller';

import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requireRole } from '@/middlewares/require-role.middleware';

const auditController = new AuditController(auditService);
const failedAiJobsController = new FailedAiJobsController();

export const auditRouter = Router();

// All audit routes are strictly restricted to ADMIN role
auditRouter.use(requireAuth);
auditRouter.use(requireRole('ADMIN'));

auditRouter.get('/', auditController.listLogs);
auditRouter.get('/filter-options', auditController.getFilterOptions);
auditRouter.get('/failed-ai-jobs', failedAiJobsController.listFailedJobs);

