import { Router } from 'express';

import { ApplicationController } from './application.controller';

import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new ApplicationController();

export const applicationsRouter = Router();

// All application routes require authentication
applicationsRouter.use(requireAuth);

// Student self-service
applicationsRouter.post('/', requirePermission('applications.apply'), controller.apply);
applicationsRouter.get('/me', requirePermission('applications.view_own'), controller.getMyApplications);
applicationsRouter.get('/:id', controller.getById);
applicationsRouter.delete('/:id', requirePermission('applications.apply'), controller.withdraw);

// Faculty: view and manage applications by opportunity
applicationsRouter.get(
  '/by-opportunity/:opportunityId',
  requirePermission('applications.view_all'),
  controller.listByOpportunity,
);
applicationsRouter.patch(
  '/:id/status',
  requirePermission('applications.update_status'),
  controller.updateStatus,
);
