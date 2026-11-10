import { relations, sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  integer,
  uniqueIndex,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { timestamps } from './_shared';
import { careerPaths } from './career.schema';
import { academicPrograms, batches, departments, users } from './identity.schema';
import { learningResources } from './preparation.schema';
import { opportunities } from './opportunities.schema';

export const proficiencyLevelEnum = pgEnum('proficiency_level', [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
]);

export const roadmapStatusEnum = pgEnum('roadmap_status', ['active', 'completed', 'archived']);

export const studentProfiles = pgTable('student_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  rollNumber: varchar('roll_number', { length: 50 }).notNull().unique(),
  // ── Relational FKs replace free-text department/batchYear ──
  departmentId: uuid('department_id')
    .notNull()
    .references(() => departments.id),
  programId: uuid('program_id')
    .notNull()
    .references(() => academicPrograms.id),
  batchId: uuid('batch_id')
    .notNull()
    .references(() => batches.id),
  cgpa: numeric('cgpa', { precision: 4, scale: 2 }),
  bio: text('bio'),
  linkedinUrl: text('linkedin_url'),
  githubUrl: text('github_url'),
  portfolioUrl: text('portfolio_url'),
  careerInterests: jsonb('career_interests').notNull().default('[]'), // string[]
  projects: jsonb('projects').notNull().default('[]'), // ProjectEntry[]
  certifications: jsonb('certifications').notNull().default('[]'), // CertificationEntry[]
  achievements: jsonb('achievements').notNull().default('[]'), // AchievementEntry[]
  isPlacementEligible: boolean('is_placement_eligible').notNull().default(true),
  ...timestamps,
});

/**
 * A student may have multiple resume versions (e.g. tailored per role). `isPrimary`
 * marks the default one surfaced in applications unless overridden per-application.
 */
export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => studentProfiles.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 150 }).notNull(),
  templateId: varchar('template_id', { length: 50 }).notNull().default('modern'),
  content: jsonb('content').notNull(), // structured resume-builder data (sections, entries)
  fileUrl: text('file_url'), // rendered PDF in Supabase Storage
  version: integer('version').notNull().default(1),
  isPrimary: boolean('is_primary').notNull().default(false),
  ...timestamps,
});

/**
 * AI-powered resume analysis results. Each analysis is immutable (re-running creates a new row)
 * so students can see how their resume quality evolved over time.
 */
export const resumeAnalyses = pgTable('resume_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  resumeId: uuid('resume_id')
    .notNull()
    .references(() => resumes.id, { onDelete: 'cascade' }),
  overallScore: numeric('overall_score', { precision: 5, scale: 2 }), // 0-100
  atsScore: numeric('ats_score', { precision: 5, scale: 2 }), // 0-100
  skillScore: numeric('skill_score', { precision: 5, scale: 2 }), // 0-100
  keywordScore: numeric('keyword_score', { precision: 5, scale: 2 }), // 0-100
  formatScore: numeric('format_score', { precision: 5, scale: 2 }), // 0-100
  missingSkills: jsonb('missing_skills').notNull().default('[]'), // string[]
  improvementSuggestions: jsonb('improvement_suggestions').notNull().default('[]'), // { area, suggestion }[]
  aiInsights: jsonb('ai_insights').notNull().default('[]'), // string[] — LLM-generated deep insights
  aiSummaryRewrite: text('ai_summary_rewrite'), // LLM-suggested professional summary rewrite
  modelVersion: varchar('model_version', { length: 100 }).notNull().default('v1.0'),
  analyzedAt: timestamp('analyzed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 100 }).notNull(), // e.g. 'programming_language', 'framework', 'soft_skill'
  ...timestamps,
});

export const studentSkills = pgTable(
  'student_skills',
  {
    studentId: uuid('student_id')
      .notNull()
      .references(() => studentProfiles.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    proficiency: proficiencyLevelEnum('proficiency').notNull().default('beginner'),
  },
  (table) => [primaryKey({ columns: [table.studentId, table.skillId] })],
);

// ── Career Roadmaps (relational, replaces JSONB milestones) ─────────────

export const careerRoadmaps = pgTable('career_roadmaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => studentProfiles.id, { onDelete: 'cascade' }),
  targetRole: varchar('target_role', { length: 150 }).notNull(),
  careerPathId: uuid('career_path_id').references((): AnyPgColumn => careerPaths.id),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: roadmapStatusEnum('status').notNull().default('active'),
  progressPercent: integer('progress_percent').notNull().default(0),
  generatedByAi: boolean('generated_by_ai').notNull().default(false),
  ...timestamps,
}, (table) => [uniqueIndex('career_roadmaps_one_active_idx').on(table.studentId).where(sql`${table.status} = 'active'`)]);

/** Individual stages within a career roadmap. Queryable and orderable. */
export const roadmapStages = pgTable('roadmap_stages', {
  id: uuid('id').primaryKey().defaultRandom(),
  roadmapId: uuid('roadmap_id')
    .notNull()
    .references(() => careerRoadmaps.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  isCompleted: boolean('is_completed').notNull().default(false),
  snapshot: jsonb('snapshot'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  ...timestamps,
});

/** Resources linked to a specific roadmap stage. */
export const roadmapStageResources = pgTable(
  'roadmap_stage_resources',
  {
    stageId: uuid('stage_id')
      .notNull()
      .references(() => roadmapStages.id, { onDelete: 'cascade' }),
    // FK to learning_resources — defined without direct import to avoid circular dep
    // (student.schema ↔ preparation.schema). The relation is wired in preparation.schema.ts.
    resourceId: uuid('resource_id').notNull().references((): AnyPgColumn => learningResources.id),
  },
  (table) => [primaryKey({ columns: [table.stageId, table.resourceId] })],
);

/** Skills targeted by a specific roadmap stage. */
export const roadmapStageSkills = pgTable(
  'roadmap_stage_skills',
  {
    stageId: uuid('stage_id')
      .notNull()
      .references(() => roadmapStages.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.stageId, table.skillId] })],
);

/**
 * Snapshot-based: each analysis is immutable once created (re-running creates a new row),
 * so students/TPOs can see how the gap evolved over time.
 */
export const skillGapAnalyses = pgTable('skill_gap_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => studentProfiles.id, { onDelete: 'cascade' }),
  targetRole: varchar('target_role', { length: 150 }).notNull(),
  currentSkills: jsonb('current_skills').notNull(), // snapshot at analysis time
  careerPathId: uuid('career_path_id').references((): AnyPgColumn => careerPaths.id),
  opportunityId: uuid('opportunity_id').references((): AnyPgColumn => opportunities.id),
  ruleVersion: varchar('rule_version', { length: 50 }).notNull().default('phase6-rules-v1'),
  result: jsonb('result'),
  requiredSkills: jsonb('required_skills').notNull(),
  gapSkills: jsonb('gap_skills').notNull(),
  recommendations: jsonb('recommendations').notNull().default('[]'),
  createdAt: timestamps.createdAt,
});

/** Student bookmarks/saves for opportunities. */
export const savedOpportunities = pgTable('saved_opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => studentProfiles.id, { onDelete: 'cascade' }),
  opportunityId: uuid('opportunity_id').notNull(),
  // FK to opportunities is defined in opportunities.schema.ts to avoid circular deps;
  // the column is here and the cross-schema relation is wired there.
  ...timestamps,
});

// ── Relations ────────────────────────────────────────────────────────────

export const studentProfilesRelations = relations(studentProfiles, ({ one, many }) => ({
  user: one(users, { fields: [studentProfiles.userId], references: [users.id] }),
  department: one(departments, { fields: [studentProfiles.departmentId], references: [departments.id] }),
  program: one(academicPrograms, { fields: [studentProfiles.programId], references: [academicPrograms.id] }),
  batch: one(batches, { fields: [studentProfiles.batchId], references: [batches.id] }),
  resumes: many(resumes),
  studentSkills: many(studentSkills),
  careerRoadmaps: many(careerRoadmaps),
  skillGapAnalyses: many(skillGapAnalyses),
  savedOpportunities: many(savedOpportunities),
}));

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  student: one(studentProfiles, { fields: [resumes.studentId], references: [studentProfiles.id] }),
  analyses: many(resumeAnalyses),
}));

export const resumeAnalysesRelations = relations(resumeAnalyses, ({ one }) => ({
  resume: one(resumes, { fields: [resumeAnalyses.resumeId], references: [resumes.id] }),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  studentSkills: many(studentSkills),
  roadmapStageSkills: many(roadmapStageSkills),
}));

export const studentSkillsRelations = relations(studentSkills, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [studentSkills.studentId],
    references: [studentProfiles.id],
  }),
  skill: one(skills, { fields: [studentSkills.skillId], references: [skills.id] }),
}));

export const careerRoadmapsRelations = relations(careerRoadmaps, ({ one, many }) => ({
  student: one(studentProfiles, {
    fields: [careerRoadmaps.studentId],
    references: [studentProfiles.id],
  }),
  stages: many(roadmapStages),
}));

export const roadmapStagesRelations = relations(roadmapStages, ({ one, many }) => ({
  roadmap: one(careerRoadmaps, {
    fields: [roadmapStages.roadmapId],
    references: [careerRoadmaps.id],
  }),
  resources: many(roadmapStageResources),
  skills: many(roadmapStageSkills),
}));

export const roadmapStageResourcesRelations = relations(roadmapStageResources, ({ one }) => ({
  stage: one(roadmapStages, {
    fields: [roadmapStageResources.stageId],
    references: [roadmapStages.id],
  }),
  // resource relation is wired in preparation.schema.ts to avoid circular imports
}));

export const roadmapStageSkillsRelations = relations(roadmapStageSkills, ({ one }) => ({
  stage: one(roadmapStages, {
    fields: [roadmapStageSkills.stageId],
    references: [roadmapStages.id],
  }),
  skill: one(skills, {
    fields: [roadmapStageSkills.skillId],
    references: [skills.id],
  }),
}));

export const skillGapAnalysesRelations = relations(skillGapAnalyses, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [skillGapAnalyses.studentId],
    references: [studentProfiles.id],
  }),
}));

export const savedOpportunitiesRelations = relations(savedOpportunities, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [savedOpportunities.studentId],
    references: [studentProfiles.id],
  }),
}));
