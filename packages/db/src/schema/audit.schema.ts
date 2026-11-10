import { relations } from 'drizzle-orm';
import { inet, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './identity.schema';

/**
 * Append-only audit trail for sensitive/administrative actions (role changes, application
 * status overrides, drive cancellations, resume deletions, etc). Never updated or deleted
 * by application code — write-once by design.
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(), // e.g. 'application.status_changed'
  entityType: varchar('entity_type', { length: 100 }).notNull(), // e.g. 'job_application'
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata').notNull().default('{}'), // before/after diff, extra context
  ipAddress: inet('ip_address'),
  userAgent: varchar('user_agent', { length: 300 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
