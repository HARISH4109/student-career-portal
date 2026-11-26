import { db, schema } from '@career-portal/db';
import { and, eq, ilike } from 'drizzle-orm';

import { escapeLikePattern } from '@/shared/db/escape-like';

export class SkillsRepository {
  async listSkills(search?: string, category?: string) {
    const conditions = [];
    if (category) {
      conditions.push(eq(schema.skills.category, category));
    }
    if (search) {
      conditions.push(ilike(schema.skills.name, `%${escapeLikePattern(search)}%`));
    }

    return db.query.skills.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: (skills, { asc }) => [asc(skills.name)],
    });
  }

  async findSkillByName(name: string) {
    return db.query.skills.findFirst({
      where: ilike(schema.skills.name, name),
    });
  }

  async findOrCreateSkill(name: string, category = 'technical') {
    const existing = await this.findSkillByName(name);
    if (existing) return existing;

    const inserted = await db
      .insert(schema.skills)
      .values({ name, category })
      .onConflictDoNothing()
      .returning();

    return inserted[0] || (await this.findSkillByName(name));
  }
}
