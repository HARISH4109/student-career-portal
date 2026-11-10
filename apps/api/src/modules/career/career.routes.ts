import { Router } from 'express';

import { CareerController } from './career.controller';

import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new CareerController();
export const careerPathsRouter = Router();
export const roadmapsRouter = Router();
export const resourcesRouter = Router();
export const skillGapRouter = Router();
careerPathsRouter.use(requireAuth, requirePermission('resources.view'));
careerPathsRouter.get('/', controller.paths);
careerPathsRouter.get('/:id', controller.path);
careerPathsRouter.post('/', requirePermission('career_paths.manage'), controller.createPath);
careerPathsRouter.put('/:id', requirePermission('career_paths.manage'), controller.updatePath);
roadmapsRouter.use(requireAuth, requirePermission('roadmaps.manage_own'));
roadmapsRouter.get('/me', controller.roadmaps);
roadmapsRouter.post('/', controller.start);
roadmapsRouter.get('/:id', controller.roadmap);
roadmapsRouter.patch('/:id/stages/:stageId', controller.stage);
resourcesRouter.use(requireAuth, requirePermission('resources.view'));
resourcesRouter.get('/', controller.resources);
resourcesRouter.get('/:id', controller.resource);
resourcesRouter.post('/', requirePermission('resources.manage'), controller.createResource);
resourcesRouter.put('/:id', requirePermission('resources.manage'), controller.updateResource);
resourcesRouter.patch(
  '/:id/progress',
  requirePermission('roadmaps.manage_own'),
  controller.progress,
);
skillGapRouter.use(requireAuth, requirePermission('skill_gap.analyze_own'));
skillGapRouter.get('/me', controller.analyses);
skillGapRouter.get('/:id', controller.analysis);
skillGapRouter.post('/', controller.analyze);
