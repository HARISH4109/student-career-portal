import { Router } from 'express';

import { SavedOpportunityController } from './saved-opportunity.controller';

import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new SavedOpportunityController();

export const savedOpportunitiesRouter = Router();

// All saved opportunity routes require authentication (student-only functionality)
savedOpportunitiesRouter.use(requireAuth);

savedOpportunitiesRouter.get('/', requirePermission('opportunities.view'), controller.list);
savedOpportunitiesRouter.post('/', requirePermission('opportunities.view'), controller.save);
savedOpportunitiesRouter.delete('/:opportunityId', requirePermission('opportunities.view'), controller.unsave);
