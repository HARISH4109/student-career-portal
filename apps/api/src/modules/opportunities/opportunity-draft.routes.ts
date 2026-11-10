import { Router } from 'express';

import { OpportunityDraftController } from './opportunity-draft.controller';

import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new OpportunityDraftController();

export const opportunityDraftRouter = Router();

// All draft pipeline routes require authentication
opportunityDraftRouter.use(requireAuth);

// Draft ingestion, listing, viewing, editing (faculty with create permission)
opportunityDraftRouter.post('/ingest', requirePermission('opportunities.create'), controller.ingest);
opportunityDraftRouter.get('/counts', requirePermission('opportunities.create'), controller.getCounts);
opportunityDraftRouter.get('/', requirePermission('opportunities.create'), controller.list);
opportunityDraftRouter.get('/:id', requirePermission('opportunities.create'), controller.getById);
opportunityDraftRouter.patch('/:id', requirePermission('opportunities.create'), controller.update);
opportunityDraftRouter.post('/:id/retry', requirePermission('opportunities.create'), controller.retry);

// Review decision endpoints (faculty with publish permission)
opportunityDraftRouter.post('/:id/approve', requirePermission('opportunities.publish'), controller.approve);
opportunityDraftRouter.post('/:id/reject', requirePermission('opportunities.publish'), controller.reject);
opportunityDraftRouter.delete('/:id', requirePermission('opportunities.create'), controller.delete);
