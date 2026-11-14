import type { PaginationMeta } from '@career-portal/shared-types';

import type { AuditFilterOptions, AuditLogItem, AuditLogsQuery, CreateAuditLogParams } from './audit.dto';
import { AuditRepository } from './audit.repository';
import { logger } from '@/infrastructure/logger';
import { getRequestContext } from '@/shared/context/request-context';

export class AuditService {
  constructor(private readonly auditRepo: AuditRepository = new AuditRepository()) {}

  /**
   * Records an audit log event.
   * Fire-and-forget: gracefully catches and logs any errors without throwing,
   * guaranteeing that audit logging never interrupts core business flows.
   * Automatically enriches with Request ID, Origin, IP, and User-Agent from AsyncLocalStorage.
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    try {
      const ctx = getRequestContext();
      const resolvedParams: CreateAuditLogParams = {
        ...params,
        requestId: params.requestId !== undefined ? params.requestId : (ctx?.requestId ?? null),
        ipAddress: params.ipAddress !== undefined ? params.ipAddress : (ctx?.ipAddress ?? null),
        userAgent: params.userAgent !== undefined ? params.userAgent : (ctx?.userAgent ?? null),
        origin: params.origin !== undefined ? params.origin : (ctx?.origin ?? null),
      };

      await this.auditRepo.create(resolvedParams);
      logger.info(
        {
          userId: resolvedParams.userId,
          action: resolvedParams.action,
          entityType: resolvedParams.entityType,
          entityId: resolvedParams.entityId,
          requestId: resolvedParams.requestId,
          origin: resolvedParams.origin,
        },
        'Audit event logged',
      );
    } catch (error) {
      logger.error({ err: error, auditParams: params }, 'Failed to write audit log');
    }
  }

  async queryLogs(
    query: AuditLogsQuery,
  ): Promise<{ logs: AuditLogItem[]; meta: PaginationMeta }> {
    const { logs, total } = await this.auditRepo.findMany(query);
    return {
      logs,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / query.pageSize) || 1,
      },
    };
  }

  async getFilterOptions(): Promise<AuditFilterOptions> {
    return this.auditRepo.getFilterOptions();
  }
}

export const auditService = new AuditService();

