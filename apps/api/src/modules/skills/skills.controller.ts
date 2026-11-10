import type { NextFunction, Request, Response } from 'express';

import { SkillsService } from './skills.service';

import { sendSuccess } from '@/shared/http/send-success';

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
      const { name, category } = req.body as { name?: string; category?: string };
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ success: false, error: { message: 'Skill name is required' } });
        return;
      }
      const skill = await this.skillsService.createSkill(name.trim(), category?.trim() || 'technical');
      sendSuccess(res, skill, 201);
    } catch (error) {
      next(error);
    }
  };
}
