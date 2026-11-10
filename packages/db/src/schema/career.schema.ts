import { boolean, jsonb, pgTable, primaryKey, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { timestamps } from './_shared';
import { users } from './identity.schema';
import { learningResources } from './preparation.schema';
import { skills } from './student.schema';

export const careerPaths = pgTable('career_paths', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 150 }).notNull(),
  slug: varchar('slug', { length: 180 }).unique(),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').notNull().default(false),
  // Ordered template content. Canonical skill/resource references are validated on write.
  stages: jsonb('stages').notNull().default([]),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  ...timestamps,
});
export const resourceSkills = pgTable(
  'resource_skills',
  {
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => learningResources.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.skillId] })],
);
export const resourceCareerPaths = pgTable(
  'resource_career_paths',
  {
    resourceId: uuid('resource_id')
      .notNull()
      .references(() => learningResources.id, { onDelete: 'cascade' }),
    careerPathId: uuid('career_path_id')
      .notNull()
      .references(() => careerPaths.id),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.careerPathId] })],
);
