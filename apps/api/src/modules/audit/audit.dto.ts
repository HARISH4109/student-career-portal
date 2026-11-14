import { z } from 'zod';

export const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  requestId: z.string().trim().optional(),
  origin: z.string().trim().optional(),
  dateFrom: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  dateTo: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  search: z.string().trim().optional(),
});

export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;

export interface AuditLogItem {
  id: string;
  userId: string | null;
  userEmail?: string | null;
  userFullName?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  requestId: string | null;
  origin: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface CreateAuditLogParams {
  userId?: string | null | undefined;
  action: string;
  entityType: string;
  entityId?: string | null | undefined;
  requestId?: string | null | undefined;
  origin?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export interface AuditFilterOptions {
  actions: string[];
  entityTypes: string[];
}
