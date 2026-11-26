import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { SkillsService } from './skills.service';

import { ValidationError } from '@/shared/errors/app-error';
import { sendSuccess } from '@/shared/http/send-success';

const createSkillSchema = z.object({
  name: z.string().trim().min(1, 'Skill name is required').max(100),
  category: z.string().trim().min(1).max(50).optional().default('technical'),
});

export class SkillsController {
  constructor(private readonly skillsService: SkillsService = new SkillsService()) {}

  listSkills = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const skills = await this.skillsService.listSkills(search, category);
      sendSuccess(res, skills);
    } catch (error) {
      next(error);
    }
  };

  createSkill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createSkillSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid skill data');
      }
      const skill = await this.skillsService.createSkill(parsed.data.name, parsed.data.category);
      sendSuccess(res, skill, 201);
    } catch (error) {
      next(error);
    }
  };
}
