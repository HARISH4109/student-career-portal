import { db, schema } from '@career-portal/db';

import { logger } from '@/infrastructure/logger';
import { getRequestContext } from '@/shared/context/request-context';

export interface LogAiJobParams {
  serviceName: string;
  taskType: string;
  modelUsed?: string | null | undefined;
  status?: 'failed' | 'fallback' | 'timeout' | 'success' | undefined;
  errorMessage?: string | null | undefined;
  durationMs?: number | null | undefined;
  payloadPreview?: string | null | undefined;
  userId?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  requestId?: string | null | undefined;
  origin?: string | null | undefined;
}

export class AiJobLogger {
  /**
   * Records an AI execution failure or fallback event.
   * Fire-and-forget: never throws or disrupts end-user flows.
   */
  async logFailure(params: LogAiJobParams): Promise<void> {
    try {
      const ctx = getRequestContext();
      const requestId = params.requestId !== undefined ? params.requestId : (ctx?.requestId ?? null);
      const origin = params.origin !== undefined ? params.origin : (ctx?.origin ?? null);

      await db.insert(schema.aiJobLogs).values({
        serviceName: params.serviceName,
        taskType: params.taskType,
        modelUsed: params.modelUsed ?? 'default',
        status: params.status ?? 'failed',
        errorMessage: params.errorMessage ?? 'Unknown AI service failure',
        durationMs: params.durationMs ?? null,
        requestId,
        origin,
        payloadPreview: params.payloadPreview ? params.payloadPreview.slice(0, 500) : null,
        userId: params.userId ?? null,
        metadata: params.metadata ?? {},
      });

      logger.warn(
        {
          serviceName: params.serviceName,
          taskType: params.taskType,
          errorMessage: params.errorMessage,
          requestId,
        },
        'AI job failure recorded',
      );
    } catch (error) {
      logger.error({ err: error, params }, 'Failed to record AI job failure in database');
    }
  }
}

export const aiJobLogger = new AiJobLogger();

