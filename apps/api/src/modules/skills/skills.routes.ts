import { Router } from 'express';

import { SkillsController } from './skills.controller';

import { requireAuth } from '@/middlewares/require-auth.middleware';
import { requirePermission } from '@/middlewares/require-permission.middleware';

const controller = new SkillsController();

export const skillsRouter = Router();

skillsRouter.get('/', controller.listSkills);
skillsRouter.post('/', requireAuth, requirePermission('career_paths.manage'), controller.createSkill);
