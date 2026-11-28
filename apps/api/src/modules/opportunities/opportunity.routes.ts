import { Router } from 'express';
import express from 'express';

import { OpportunityController } from './opportunity.controller';

import { aiRateLimiter } from '@/middlewares/ai-rate-limit.middleware';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';
import { ApplicationController } from '@/modules/applications/application.controller';

const controller = new OpportunityController();
const applicationController = new ApplicationController();

export const opportunitiesRouter = Router();

// All opportunity routes require authentication
opportunitiesRouter.use(requireAuth);

// Browse/search — all authenticated users with view permission
opportunitiesRouter.get('/', requirePermission('opportunities.view'), controller.list);
opportunitiesRouter.get('/:id', requirePermission('opportunities.view'), controller.getById);

// Student application via canonical /opportunities/:id/applications
opportunitiesRouter.post(
  '/:id/applications',
  requirePermission('applications.apply'),
  (req, res, next) => {
    req.body = { ...(typeof req.body === 'object' && req.body !== null ? req.body : {}), opportunityId: String(req.params.id) };
    return applicationController.apply(req, res, next);
  },
);

// Faculty-only: create, edit, status management
opportunitiesRouter.post('/', requirePermission('opportunities.create'), controller.create);
opportunitiesRouter.post('/extract', express.json({ limit: '20mb' }), requirePermission('opportunities.create'), aiRateLimiter, controller.extractFromSource);
opportunitiesRouter.put('/:id', requirePermission('opportunities.edit'), controller.update);
opportunitiesRouter.patch('/:id', requirePermission('opportunities.edit'), controller.update);
opportunitiesRouter.patch('/:id/status', requirePermission('opportunities.publish'), controller.updateStatus);
opportunitiesRouter.post('/:id/publish', requirePermission('opportunities.publish'), controller.publish);
opportunitiesRouter.post('/:id/close', requirePermission('opportunities.publish'), controller.close);
opportunitiesRouter.delete('/:id', requirePermission('opportunities.create'), controller.delete);

