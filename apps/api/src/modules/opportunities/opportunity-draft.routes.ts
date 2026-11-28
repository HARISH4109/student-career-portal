import { Router } from 'express';
import express from 'express';

import { OpportunityDraftController } from './opportunity-draft.controller';

import { aiRateLimiter } from '@/middlewares/ai-rate-limit.middleware';
import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new OpportunityDraftController();

export const opportunityDraftRouter = Router();

// All draft pipeline routes require authentication
opportunityDraftRouter.use(requireAuth);

// Draft ingestion, listing, viewing, editing (faculty with create permission)
opportunityDraftRouter.post('/ingest', express.json({ limit: '20mb' }), requirePermission('opportunities.create'), aiRateLimiter, controller.ingest);
opportunityDraftRouter.get('/counts', requirePermission('opportunities.create'), controller.getCounts);
opportunityDraftRouter.get('/', requirePermission('opportunities.create'), controller.list);
opportunityDraftRouter.get('/:id', requirePermission('opportunities.create'), controller.getById);
opportunityDraftRouter.patch('/:id', requirePermission('opportunities.create'), controller.update);
opportunityDraftRouter.post('/:id/retry', requirePermission('opportunities.create'), aiRateLimiter, controller.retry);

// Review decision endpoints (faculty with publish permission)
opportunityDraftRouter.post('/:id/approve', requirePermission('opportunities.publish'), controller.approve);
opportunityDraftRouter.post('/:id/reject', requirePermission('opportunities.publish'), controller.reject);
opportunityDraftRouter.delete('/:id', requirePermission('opportunities.create'), controller.delete);

// Canonical Phase 12 /extraction router
export const extractionRouter = Router();
extractionRouter.use(requireAuth);
extractionRouter.post('/sources', express.json({ limit: '20mb' }), requirePermission('opportunities.create'), aiRateLimiter, controller.ingest);
extractionRouter.get('/drafts', requirePermission('opportunities.create'), controller.list);
extractionRouter.get('/drafts/:id', requirePermission('opportunities.create'), controller.getById);
extractionRouter.patch('/drafts/:id', requirePermission('opportunities.create'), controller.update);
extractionRouter.post('/drafts/:id/approve', requirePermission('opportunities.publish'), controller.approve);
extractionRouter.post('/drafts/:id/reject', requirePermission('opportunities.publish'), controller.reject);
extractionRouter.post('/runs/:id/retry', requirePermission('opportunities.create'), aiRateLimiter, controller.retryByRun);
