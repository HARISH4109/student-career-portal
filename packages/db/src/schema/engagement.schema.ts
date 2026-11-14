import { relations } from 'drizzle-orm';
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { notificationTypeEnum, timestamps } from './_shared';
import { batches, departments, users } from './identity.schema';

export const noticeCategoryEnum = pgEnum('notice_category', [
  'placement',
  'academic',
  'event',
  'general',
]);

export const noticeStatusEnum = pgEnum('notice_status', [
  'draft',
  'scheduled',
  'published',
  'expired',
  'archived',
]);

export const notices = pgTable('notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  category: noticeCategoryEnum('category').notNull().default('general'),
  status: noticeStatusEnum('status').notNull().default('published'),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  postedBy: uuid('posted_by')
    .notNull()
    .references(() => users.id),
  // Hybrid targeting: JSONB for ad-hoc role-based targeting, optional relational FKs
  // for queryable department/batch targeting. Empty targetAudience = everyone.
  targetAudience: jsonb('target_audience').notNull().default('{}'),
  /** Optional FK for targeted notices to a specific department */
  targetDepartmentId: uuid('target_department_id').references(() => departments.id),
  /** Optional FK for targeted notices to a specific batch */
  targetBatchId: uuid('target_batch_id').references(() => batches.id),
  attachments: jsonb('attachments').notNull().default('[]'),
  posterUrl: text('poster_url'),
  actionUrl: text('action_url'),
  isPinned: boolean('is_pinned').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ...timestamps,
});

/**
 * In-app notifications, pushed additionally over Socket.io in real time and
 * mirrored here for persistence/read-state and the notification center UI.
 */
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),
  actionUrl: text('action_url'),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamps.createdAt,
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  // per-type opt-outs, e.g. { "new_job_posting": false }
  mutedTypes: jsonb('muted_types').notNull().default('[]'),
  ...timestamps,
});

// ── Relations ────────────────────────────────────────────────────────────

export const noticesRelations = relations(notices, ({ one }) => ({
  postedByUser: one(users, { fields: [notices.postedBy], references: [users.id] }),
  targetDepartment: one(departments, { fields: [notices.targetDepartmentId], references: [departments.id] }),
  targetBatch: one(batches, { fields: [notices.targetBatchId], references: [batches.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));
