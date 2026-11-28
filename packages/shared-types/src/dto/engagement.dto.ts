import { z } from 'zod';
import { httpUrlSchema, optionalHttpUrlSchema, safePosterUrlSchema } from './url-validation';
import { NOTICE_CATEGORIES, NOTICE_STATUSES, NOTIFICATION_TYPES } from '../enums';

export const NoticeAttachmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  url: httpUrlSchema('Invalid attachment URL'),
  size: z.number().int().nonnegative().optional(),
  mimeType: z.string().optional(),
});
export type NoticeAttachment = z.infer<typeof NoticeAttachmentSchema>;

export const CreateNoticeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(NOTICE_CATEGORIES).default('general'),
  status: z.enum(NOTICE_STATUSES).default('published'),
  targetAudience: z.record(z.string(), z.unknown()).optional().default({}),
  targetDepartmentId: z.string().uuid().nullable().optional(),
  targetBatchId: z.string().uuid().nullable().optional(),
  attachments: z.array(NoticeAttachmentSchema).optional().default([]),
  posterUrl: safePosterUrlSchema,
  actionUrl: optionalHttpUrlSchema('Invalid action URL'),
  linkUrl: optionalHttpUrlSchema('Invalid link URL'),
  isPinned: z.boolean().optional().default(false),
  publishedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});
export type CreateNoticeInput = z.infer<typeof CreateNoticeSchema>;

export const UpdateNoticeSchema = CreateNoticeSchema.partial();
export type UpdateNoticeInput = z.infer<typeof UpdateNoticeSchema>;

export const NoticeQuerySchema = z.object({
  category: z.enum(NOTICE_CATEGORIES).optional(),
  status: z.enum(NOTICE_STATUSES).optional(),
  isPinned: z.coerce.boolean().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type NoticeQueryInput = z.infer<typeof NoticeQuerySchema>;

export const NoticeResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  category: z.enum(NOTICE_CATEGORIES),
  status: z.enum(NOTICE_STATUSES),
  postedBy: z.string().uuid(),
  postedByName: z.string().optional(),
  targetAudience: z.record(z.string(), z.unknown()),
  targetDepartmentId: z.string().uuid().nullable().optional(),
  targetBatchId: z.string().uuid().nullable().optional(),
  targetDepartmentName: z.string().nullable().optional(),
  targetBatchYear: z.number().nullable().optional(),
  attachments: z.array(NoticeAttachmentSchema),
  posterUrl: z.string().nullable().optional(),
  actionUrl: z.string().nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  isPinned: z.boolean(),
  publishedAt: z.string(),
  expiresAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type NoticeResponse = z.infer<typeof NoticeResponseSchema>;

export const NotificationQuerySchema = z.object({
  isRead: z.coerce.boolean().optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type NotificationQueryInput = z.infer<typeof NotificationQuerySchema>;

export const NotificationResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  message: z.string(),
  actionUrl: z.string().nullable().optional(),
  isRead: z.boolean(),
  readAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;

export const UpdateNotificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  mutedTypes: z.array(z.string()).optional(),
});
export type UpdateNotificationPreferencesInput = z.infer<typeof UpdateNotificationPreferencesSchema>;

export const NotificationPreferencesResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  mutedTypes: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type NotificationPreferencesResponse = z.infer<typeof NotificationPreferencesResponseSchema>;

