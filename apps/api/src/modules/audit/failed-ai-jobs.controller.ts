import { db, schema } from '@career-portal/db';
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { env } from '@/config/env';
import { sendSuccess } from '@/shared/http/send-success';

const failedAiJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  dateFrom: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  dateTo: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  taskType: z.string().trim().optional(),
});

export interface FailedAiJobItem {
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

export class FailedAiJobsController {
  listFailedJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = failedAiJobsQuerySchema.parse(req.query);
      const { page, pageSize, dateFrom, dateTo, taskType } = query;
      const offset = (page - 1) * pageSize;

      // 1. Extraction run conditions
      const extractionConditions = [eq(schema.aiExtractionRuns.status, 'failed')];
      // 2. AI Job log conditions (errors and fallbacks across the platform)
      const jobLogConditions = [inArray(schema.aiJobLogs.status, ['failed', 'fallback'])];

      if (dateFrom) {
        extractionConditions.push(gte(schema.aiExtractionRuns.createdAt, new Date(dateFrom)));
        jobLogConditions.push(gte(schema.aiJobLogs.createdAt, new Date(dateFrom)));
      }
      if (dateTo) {
        const toDate = dateTo.length === 10 ? new Date(`${dateTo}T23:59:59.999Z`) : new Date(dateTo);
        extractionConditions.push(lte(schema.aiExtractionRuns.createdAt, toDate));
        jobLogConditions.push(lte(schema.aiJobLogs.createdAt, toDate));
      }

      // Query extraction runs
      const extractionRows = await db.query.aiExtractionRuns.findMany({
        where: and(...extractionConditions),
        with: {
          source: {
            with: {
              submittedByUser: true,
            },
          },
        },
        orderBy: [desc(schema.aiExtractionRuns.createdAt)],
        limit: 100,
      });

      // Query AI service job logs
      const jobLogRows = await db.query.aiJobLogs.findMany({
        where: and(...jobLogConditions),
        with: {
          user: true,
        },
        orderBy: [desc(schema.aiJobLogs.createdAt)],
        limit: 100,
      });

      const extractionItems: FailedAiJobItem[] = extractionRows.map((r) => {
        const raw = r.source.rawContent;
        const preview = raw.length > 200 ? `${raw.slice(0, 197)}...` : raw;
        return {
          id: r.id,
          sourceId: r.sourceId,
          serviceName: 'Opportunity Ingestion Service',
          taskType: 'opportunity_extraction',
          sourceType: r.source.sourceType,
          rawContentPreview: preview,
          fileName: r.source.fileName,
          modelUsed: r.modelUsed,
          errorMessage: r.errorMessage,
          durationMs: r.durationMs,
          requestId: null,
          origin: null,
          submittedBy: r.source.submittedBy,
          submitterEmail: r.source.submittedByUser.email,
          submitterName: r.source.submittedByUser.fullName,
          createdAt: r.createdAt.toISOString(),
        };
      });

      const jobLogItems: FailedAiJobItem[] = jobLogRows.map((r) => ({
        id: r.id,
        sourceId: null,
        serviceName: r.serviceName,
        taskType: r.taskType,
        sourceType: 'ai_microservice',
        rawContentPreview: r.payloadPreview || 'AI microservice payload',
        fileName: null,
        modelUsed: r.modelUsed,
        errorMessage: r.errorMessage,
        durationMs: r.durationMs,
        requestId: r.requestId,
        origin: r.origin,
        submittedBy: r.userId,
        submitterEmail: r.user?.email ?? null,
        submitterName: r.user?.fullName ?? null,
        createdAt: r.createdAt.toISOString(),
      }));

      let allJobs = [...extractionItems, ...jobLogItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      if (taskType) {
        allJobs = allJobs.filter((j) => j.taskType === taskType || j.serviceName.toLowerCase().includes(taskType.toLowerCase()));
      }

      const total = allJobs.length;
      const paginatedData = allJobs.slice(offset, offset + pageSize);

      // Probe live status of external AI service
      let aiServiceLiveStatus: 'ok' | 'offline' | 'unconfigured' = 'unconfigured';
      let latencyMs = 0;
      if (env.AI_SERVICE_BASE_URL) {
        const startTime = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2000);
          const probe = await fetch(`${env.AI_SERVICE_BASE_URL}/v1/health`, {
            signal: controller.signal,
          }).catch(() => null);
          clearTimeout(timeout);
          latencyMs = Date.now() - startTime;
          aiServiceLiveStatus = probe && probe.ok ? 'ok' : 'offline';
        } catch {
          aiServiceLiveStatus = 'offline';
        }
      }

      sendSuccess(res, paginatedData, 200, {
        page,
        pageSize,
        totalItems: total,
        totalPages: Math.ceil(total / pageSize) || 1,
        aiService: {
          baseUrl: env.AI_SERVICE_BASE_URL || 'http://localhost:8000',
          status: aiServiceLiveStatus,
          latencyMs,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}

