import type { SkillDto } from '@career-portal/shared-types';

import { SkillsRepository } from './skills.repository';

export class SkillsService {
  constructor(private readonly skillsRepo: SkillsRepository = new SkillsRepository()) {}

  async listSkills(search?: string, category?: string): Promise<SkillDto[]> {
    const raw = await this.skillsRepo.listSkills(search, category);
    return raw.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
    }));
  }

  async createSkill(name: string, category = 'technical'): Promise<SkillDto> {
    const raw = await this.skillsRepo.findOrCreateSkill(name, category);
    return {
      id: raw.id,
      name: raw.name,
      category: raw.category,
    };
  }
}
