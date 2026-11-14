import { relations } from 'drizzle-orm';
import { index, inet, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './identity.schema';

/**
 * Append-only audit trail for sensitive/administrative actions (role changes, application
 * status overrides, drive cancellations, resume deletions, etc). Never updated or deleted
 * by application code — write-once by design.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(), // e.g. 'application.status_changed'
    entityType: varchar('entity_type', { length: 100 }).notNull(), // e.g. 'job_application'
    entityId: uuid('entity_id'),
    requestId: varchar('request_id', { length: 64 }),
    origin: varchar('origin', { length: 255 }),
    metadata: jsonb('metadata').notNull().default('{}'), // before/after diff, extra context
    ipAddress: inet('ip_address'),
    userAgent: varchar('user_agent', { length: 300 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_logs_action_idx').on(table.action),
    index('audit_logs_entity_type_idx').on(table.entityType),
    index('audit_logs_created_at_idx').on(table.createdAt),
    index('audit_logs_user_id_idx').on(table.userId),
    index('audit_logs_request_id_idx').on(table.requestId),
    index('audit_logs_origin_idx').on(table.origin),
  ],
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

/**
 * Centralized log of AI workloads, background extraction jobs, and microservice calls.
 * Records failures, timeouts, and fallbacks for administrative observability and audit.
 */
export const aiJobLogs = pgTable(
  'ai_job_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    serviceName: varchar('service_name', { length: 100 }).notNull(), // e.g. 'FastAPI AI Microservice', 'Resume ATS Analyzer', 'Mock Interview Evaluator'
    taskType: varchar('task_type', { length: 50 }).notNull(), // e.g. 'resume_analysis', 'resume_enhancement', 'resume_match', 'interview_eval', 'service_health'
    modelUsed: varchar('model_used', { length: 100 }),
    status: varchar('status', { length: 20 }).notNull().default('failed'), // 'failed', 'fallback', 'timeout', 'success'
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    requestId: varchar('request_id', { length: 64 }),
    origin: varchar('origin', { length: 255 }),
    payloadPreview: text('payload_preview'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    metadata: jsonb('metadata').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('ai_job_logs_service_name_idx').on(table.serviceName),
    index('ai_job_logs_task_type_idx').on(table.taskType),
    index('ai_job_logs_status_idx').on(table.status),
    index('ai_job_logs_created_at_idx').on(table.createdAt),
    index('ai_job_logs_user_id_idx').on(table.userId),
    index('ai_job_logs_request_id_idx').on(table.requestId),
  ],
);

export const aiJobLogsRelations = relations(aiJobLogs, ({ one }) => ({
  user: one(users, { fields: [aiJobLogs.userId], references: [users.id] }),
}));
