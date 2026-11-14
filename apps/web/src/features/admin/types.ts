import type { PaginationMeta, RoleName } from '@career-portal/shared-types';

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userFullName: string | null;
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

export interface AuditFilterOptions {
  actions: string[];
  entityTypes: string[];
}

export interface AuditLogQueryParams {
  page?: number | undefined;
  pageSize?: number | undefined;
  action?: string | undefined;
  entityType?: string | undefined;
  userId?: string | undefined;
  requestId?: string | undefined;
  origin?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  search?: string | undefined;
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  roles: RoleName[];
  createdAt: string;
}

export interface UserQueryParams {
  page?: number | undefined;
  pageSize?: number | undefined;
  search?: string | undefined;
  role?: string | undefined;
  isActive?: boolean | undefined;
}

export interface AdminHealthStatus {
  status: 'ok' | 'degraded';
  uptime: number;
  dependencies: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    aiService: 'ok' | 'error' | 'unconfigured';
    extractionAgent?: 'ok' | 'error' | 'unconfigured';
  };
  counts: {
    totalUsers: number;
    activeUsers: number;
    pendingDrafts: number;
    failedAiJobs: number;
  };
  serverVersion: string;
  nodeVersion: string;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
}

export interface FailedAiJob {
  id: string;
  sourceId: string | null;
  serviceName: string;
  taskType: string;
  sourceType: string;
  rawContentPreview: string;
  fileName: string | null;
  modelUsed: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  requestId: string | null;
  origin: string | null;
  submittedBy: string | null;
  submitterEmail: string | null;
  submitterName: string | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
