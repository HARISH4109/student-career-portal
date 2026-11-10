import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { timestamps } from './_shared';
import { studentProfiles } from './student.schema';

export const recommendationTypeEnum = pgEnum('recommendation_type', [
  'opportunity',
  'internship',
  'learning_resource',
  'skill_to_learn',
  'mock_test',
]);

export const analyticsScopeEnum = pgEnum('analytics_scope', ['global', 'department', 'batch', 'company']);

/**
 * Materialized recommendation output from the Recommendation Engine, refreshed
 * periodically (cron / on-demand). Storing rather than always computing live keeps
 * the dashboard fast and gives us a history of what was recommended and why.
 *
 * Phase 0.5 additions: algorithm_version, reason_metadata, expires_at,
 * is_dismissed, dismissed_at — for richer recommendation lifecycle management.
 */
export const recommendations = pgTable('recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id')
    .notNull()
    .references(() => studentProfiles.id, { onDelete: 'cascade' }),
  type: recommendationTypeEnum('type').notNull(),
  entityId: uuid('entity_id').notNull(), // polymorphic reference (opportunity.id, resource.id, etc.)
  score: numeric('score', { precision: 5, scale: 2 }).notNull(), // 0-100 relevance score
  reason: text('reason'), // human-readable explanation surfaced in the UI
  /** Version identifier for the recommendation algorithm that produced this entry */
  algorithmVersion: varchar('algorithm_version', { length: 50 }),
  /** Structured metadata explaining why this was recommended (feature weights, matching factors) */
  reasonMetadata: jsonb('reason_metadata'),
  /** When this recommendation should no longer be surfaced */
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  /** Whether the student has dismissed this recommendation */
  isDismissed: boolean('is_dismissed').notNull().default(false),
  /** When the student dismissed this recommendation */
  dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
  ...timestamps,
});

/**
 * Pre-aggregated metrics for the Analytics Dashboard (placement rate, avg package,
 * applications per drive, etc.) computed by a scheduled job — avoids expensive
 * aggregate queries on every dashboard load.
 */
export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  snapshotDate: date('snapshot_date').notNull(),
  metricType: varchar('metric_type', { length: 100 }).notNull(), // e.g. 'placement_rate', 'applications_per_drive'
  scope: analyticsScopeEnum('scope').notNull().default('global'),
  scopeIdentifier: varchar('scope_identifier', { length: 100 }), // e.g. department name / batch year / company id
  metricData: jsonb('metric_data').notNull(), // flexible payload per metricType
  createdAt: timestamps.createdAt,
});

// ── Relations ────────────────────────────────────────────────────────────

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  student: one(studentProfiles, {
    fields: [recommendations.studentId],
    references: [studentProfiles.id],
  }),
}));
