import { pgEnum, timestamp } from 'drizzle-orm/pg-core';

/**
 * Reusable timestamp columns. Every table gets createdAt/updatedAt for auditability —
 * an enterprise app should never have a table where you can't answer "when was this changed".
 */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Soft-delete column, added to tables where hard deletes would break referential/audit integrity. */
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

// ── Cross-cutting enums (shared by 2+ bounded contexts) ────────────────────

export const opportunityTypeEnum = pgEnum('opportunity_type', ['job', 'internship']);

/**
 * Opportunity lifecycle statuses. AI-generated opportunities start as 'draft' and
 * MUST go through faculty review ('pending_review') before reaching 'published'.
 * AI never directly publishes — this is enforced at the service layer.
 */
export const opportunityStatusEnum = pgEnum('opportunity_status', [
  'draft',
  'pending_review',
  'published',
  'closed',
  'expired',
  'rejected',
]);

/**
 * Application lifecycle statuses — tracks a student's application from submission
 * through assessment, interview, and final outcome.
 */
export const applicationStatusEnum = pgEnum('application_status', [
  'applied',
  'under_review',
  'shortlisted',
  'assessment',
  'interview',
  'selected',
  'rejected',
  'withdrawn',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'application_update',
  'new_opportunity',
  'notice_published',
  'interview_reminder',
  'recommendation',
  'system',
]);

// ── AI Ingestion Pipeline enums ────────────────────────────────────────────

/**
 * Source types for the AI opportunity ingestion pipeline.
 * Faculty can submit opportunities from various channels — the system normalizes
 * all of them through the extraction workflow.
 */
export const sourceTypeEnum = pgEnum('source_type', [
  'email',
  'pdf',
  'image',
  'text',
  'url',
  'manual',
]);

/**
 * Draft lifecycle for AI-extracted opportunity data. Separates the extraction
 * output from the final published opportunity — faculty must review and approve.
 */
export const draftStatusEnum = pgEnum('draft_status', [
  'extracted',
  'pending_review',
  'needs_correction',
  'approved',
  'rejected',
  'published',
]);

export const extractionRunStatusEnum = pgEnum('extraction_run_status', [
  'queued',
  'processing',
  'completed',
  'failed',
]);

// ── Resource / Learning enums ──────────────────────────────────────────────

export const resourceTypeEnum = pgEnum('resource_type', [
  'video',
  'article',
  'research_paper',
  'course',
  'documentation',
  'ebook',
  'practice',
  'practice_set',
  'project',
]);
