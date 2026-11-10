import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
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

import {
  applicationStatusEnum,
  draftStatusEnum,
  extractionRunStatusEnum,
  opportunityStatusEnum,
  opportunityTypeEnum,
  sourceTypeEnum,
  timestamps,
} from './_shared';
import { academicPrograms, batches, departments, users } from './identity.schema';
import { resumes, savedOpportunities, skills, studentProfiles } from './student.schema';

export const workModeEnum = pgEnum('work_mode', ['remote', 'onsite', 'hybrid']);

// ── Companies ───────────────────────────────────────────────────────────

/**
 * Company data entities — no user accounts. Companies are created by
 * PLACEMENT_FACULTY manually or auto-created during AI extraction when
 * a new company name is detected. `isVerified` removed (no recruiter signup flow).
 */
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  logoUrl: text('logo_url'),
  website: text('website'),
  industry: varchar('industry', { length: 100 }),
  description: text('description'),
  ...timestamps,
});

// ── Opportunities (replaces `jobs`) ─────────────────────────────────────

export const opportunities = pgTable('opportunities', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  type: opportunityTypeEnum('type').notNull(),
  description: text('description').notNull(),
  workMode: workModeEnum('work_mode').notNull().default('onsite'),
  location: varchar('location', { length: 150 }),
  salaryMin: numeric('salary_min', { precision: 12, scale: 2 }),
  salaryMax: numeric('salary_max', { precision: 12, scale: 2 }),
  applicationDeadline: timestamp('application_deadline', { withTimezone: true }),
  applyUrl: text('apply_url'),
  applicationEmail: varchar('application_email', { length: 255 }),
  status: opportunityStatusEnum('status').notNull().default('draft'),
  postedBy: uuid('posted_by')
    .notNull()
    .references(() => users.id),
  /** FK back to the draft that produced this opportunity (null if manually created) */
  sourceDraftId: uuid('source_draft_id'),
  ...timestamps,
});

// ── Opportunity Skills (relational, replaces JSONB requiredSkills) ───────

export const opportunitySkills = pgTable(
  'opportunity_skills',
  {
    opportunityId: uuid('opportunity_id')
      .notNull()
      .references(() => opportunities.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    isRequired: boolean('is_required').notNull().default(true), // required vs. nice-to-have
  },
  (table) => [primaryKey({ columns: [table.opportunityId, table.skillId] })],
);

// ── Opportunity Eligibility (relational, replaces JSONB eligibilityCriteria) ─

/**
 * Multiple rows per opportunity — one per eligible criterion combination.
 * Enables efficient SQL `WHERE EXISTS` filtering for student eligibility checks.
 */
export const opportunityEligibility = pgTable('opportunity_eligibility', {
  id: uuid('id').primaryKey().defaultRandom(),
  opportunityId: uuid('opportunity_id')
    .notNull()
    .references(() => opportunities.id, { onDelete: 'cascade' }),
  departmentId: uuid('department_id').references(() => departments.id),
  programId: uuid('program_id').references(() => academicPrograms.id),
  batchId: uuid('batch_id').references(() => batches.id),
  minCgpa: numeric('min_cgpa', { precision: 4, scale: 2 }),
});

// ── Applications (renamed from job_applications) ────────────────────────

export const opportunityApplications = pgTable('opportunity_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  opportunityId: uuid('opportunity_id')
    .notNull()
    .references(() => opportunities.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id')
    .notNull()
    .references(() => studentProfiles.id, { onDelete: 'cascade' }),
  resumeId: uuid('resume_id')
    .references(() => resumes.id),
  status: applicationStatusEnum('status').notNull().default('applied'),
  coverNote: text('cover_note'),
  aiMatchScore: numeric('ai_match_score', { precision: 5, scale: 2 }), // 0-100
  ...timestamps,
});

/** Full audit trail of every status transition — required for enterprise-grade traceability. */
export const applicationStatusHistory = pgTable('application_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id')
    .notNull()
    .references(() => opportunityApplications.id, { onDelete: 'cascade' }),
  status: applicationStatusEnum('status').notNull(),
  changedBy: uuid('changed_by')
    .notNull()
    .references(() => users.id),
  remarks: text('remarks'),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── AI Extraction Workflow (3-entity pipeline) ──────────────────────────

/**
 * Raw input records submitted by faculty for AI extraction.
 * Source type determines the parsing strategy (URL scraping, PDF parsing, OCR, etc.)
 */
export const opportunitySources = pgTable('opportunity_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceType: sourceTypeEnum('source_type').notNull(),
  /** Raw content: URL string, pasted text, or Supabase Storage path for PDF/image uploads */
  rawContent: text('raw_content').notNull(),
  contentHash: varchar('content_hash', { length: 64 }).unique(),
  fileName: text('file_name'),
  mimeType: varchar('mime_type', { length: 150 }),
  submittedBy: uuid('submitted_by')
    .notNull()
    .references(() => users.id),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // pending | processed | failed
  ...timestamps,
});

/**
 * Per-run AI extraction execution record. Links source → draft.
 * Tracks model used, confidence score, and timing for observability.
 */
export const aiExtractionRuns = pgTable('ai_extraction_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => opportunitySources.id, { onDelete: 'cascade' }),
  status: extractionRunStatusEnum('status').notNull().default('queued'),
  modelUsed: varchar('model_used', { length: 100 }),
  confidenceScore: numeric('confidence_score', { precision: 5, scale: 2 }),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  ...timestamps,
});

/**
 * AI-extracted opportunity data awaiting faculty review.
 * Faculty can edit any field before approving. Approval creates the actual `opportunities` row.
 * AI **never** directly publishes — this entity enforces the mandatory review step.
 */
export const opportunityDrafts = pgTable('opportunity_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  extractionRunId: uuid('extraction_run_id')
    .notNull()
    .references(() => aiExtractionRuns.id, { onDelete: 'cascade' }),
  status: draftStatusEnum('status').notNull().default('pending_review'),
  /** Extracted/edited structured fields */
  title: varchar('title', { length: 200 }),
  companyName: varchar('company_name', { length: 200 }),
  type: opportunityTypeEnum('type'),
  description: text('description'),
  location: varchar('location', { length: 150 }),
  salaryMin: numeric('salary_min', { precision: 12, scale: 2 }),
  salaryMax: numeric('salary_max', { precision: 12, scale: 2 }),
  extractedSkills: jsonb('extracted_skills').notNull().default('[]'), // string[] before normalization
  extractedEligibility: jsonb('extracted_eligibility').notNull().default('{}'),
  applicationDeadline: timestamp('application_deadline', { withTimezone: true }),
  /** FK to the resulting opportunity after approval (null until approved) */
  resultingOpportunityId: uuid('resulting_opportunity_id'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewNotes: text('review_notes'),
  ...timestamps,
});

// ── Relations ────────────────────────────────────────────────────────────

export const companiesRelations = relations(companies, ({ many }) => ({
  opportunities: many(opportunities),
}));

export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  company: one(companies, { fields: [opportunities.companyId], references: [companies.id] }),
  postedByUser: one(users, { fields: [opportunities.postedBy], references: [users.id] }),
  opportunitySkills: many(opportunitySkills),
  eligibility: many(opportunityEligibility),
  applications: many(opportunityApplications),
  savedBy: many(savedOpportunities),
}));

export const opportunitySkillsRelations = relations(opportunitySkills, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [opportunitySkills.opportunityId],
    references: [opportunities.id],
  }),
  skill: one(skills, { fields: [opportunitySkills.skillId], references: [skills.id] }),
}));

export const opportunityEligibilityRelations = relations(opportunityEligibility, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [opportunityEligibility.opportunityId],
    references: [opportunities.id],
  }),
  department: one(departments, {
    fields: [opportunityEligibility.departmentId],
    references: [departments.id],
  }),
  program: one(academicPrograms, {
    fields: [opportunityEligibility.programId],
    references: [academicPrograms.id],
  }),
  batch: one(batches, {
    fields: [opportunityEligibility.batchId],
    references: [batches.id],
  }),
}));

export const opportunityApplicationsRelations = relations(
  opportunityApplications,
  ({ one, many }) => ({
    opportunity: one(opportunities, {
      fields: [opportunityApplications.opportunityId],
      references: [opportunities.id],
    }),
    student: one(studentProfiles, {
      fields: [opportunityApplications.studentId],
      references: [studentProfiles.id],
    }),
    resume: one(resumes, {
      fields: [opportunityApplications.resumeId],
      references: [resumes.id],
    }),
    statusHistory: many(applicationStatusHistory),
  }),
);

export const applicationStatusHistoryRelations = relations(
  applicationStatusHistory,
  ({ one }) => ({
    application: one(opportunityApplications, {
      fields: [applicationStatusHistory.applicationId],
      references: [opportunityApplications.id],
    }),
    changedByUser: one(users, {
      fields: [applicationStatusHistory.changedBy],
      references: [users.id],
    }),
  }),
);

// ── AI Extraction Workflow Relations ─────────────────────────────────────

export const opportunitySourcesRelations = relations(opportunitySources, ({ one, many }) => ({
  submittedByUser: one(users, {
    fields: [opportunitySources.submittedBy],
    references: [users.id],
  }),
  extractionRuns: many(aiExtractionRuns),
}));

export const aiExtractionRunsRelations = relations(aiExtractionRuns, ({ one }) => ({
  source: one(opportunitySources, {
    fields: [aiExtractionRuns.sourceId],
    references: [opportunitySources.id],
  }),
  draft: one(opportunityDrafts),
}));

export const opportunityDraftsRelations = relations(opportunityDrafts, ({ one }) => ({
  extractionRun: one(aiExtractionRuns, {
    fields: [opportunityDrafts.extractionRunId],
    references: [aiExtractionRuns.id],
  }),
  reviewedByUser: one(users, {
    fields: [opportunityDrafts.reviewedBy],
    references: [users.id],
  }),
}));
