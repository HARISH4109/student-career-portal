import { Router } from 'express';

import { CompanyController } from './company.controller';

import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new CompanyController();

export const companiesRouter = Router();

// All company routes require authentication
companiesRouter.use(requireAuth);

companiesRouter.get('/', requirePermission('opportunities.view'), controller.list);
companiesRouter.get('/:id', requirePermission('opportunities.view'), controller.getById);
companiesRouter.post('/', requirePermission('opportunities.create'), controller.create);
