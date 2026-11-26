import { Router } from 'express';
import express from 'express';

import { OpportunityController } from './opportunity.controller';

import { aiRateLimiter } from '@/middlewares/ai-rate-limit.middleware';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new OpportunityController();

export const opportunitiesRouter = Router();

// All opportunity routes require authentication
opportunitiesRouter.use(requireAuth);

// Browse/search — all authenticated users with view permission
opportunitiesRouter.get('/', requirePermission('opportunities.view'), controller.list);
opportunitiesRouter.get('/:id', requirePermission('opportunities.view'), controller.getById);

// Faculty-only: create, edit, status management
opportunitiesRouter.post('/', requirePermission('opportunities.create'), controller.create);
opportunitiesRouter.post('/extract', express.json({ limit: '20mb' }), requirePermission('opportunities.create'), aiRateLimiter, controller.extractFromSource);
opportunitiesRouter.put('/:id', requirePermission('opportunities.edit'), controller.update);
opportunitiesRouter.patch('/:id/status', requirePermission('opportunities.publish'), controller.updateStatus);
opportunitiesRouter.delete('/:id', requirePermission('opportunities.create'), controller.delete);

