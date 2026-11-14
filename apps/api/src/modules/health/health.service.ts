import { db, schema } from '@career-portal/db';
import { count, eq, sql } from 'drizzle-orm';
import Redis from 'ioredis';

import { env } from '@/config/env';
import { aiJobLogger } from '@/modules/audit/ai-job-logger';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  uptime: number;
  dependencies: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
}

export interface AdminHealthStatus extends HealthStatus {
  dependencies: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
    aiService: 'ok' | 'error' | 'unconfigured';
    extractionAgent: 'ok' | 'error' | 'unconfigured';
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

export class HealthService {
  constructor(private readonly redis: Redis) {}

  async check(): Promise<HealthStatus> {
    const [databaseOk, redisOk] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    return {
      status: databaseOk && redisOk ? 'ok' : 'degraded',
      uptime: process.uptime(),
      dependencies: {
        database: databaseOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
    };
  }

  async checkDetailed(): Promise<AdminHealthStatus> {
    const [databaseOk, redisOk, aiServiceStatus, extractionAgentStatus, counts] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkAiService(),
      this.checkExtractionAgent(),
      this.fetchEntityCounts(),
    ]);

    const mem = process.memoryUsage();
    const isDegraded = !databaseOk || !redisOk || aiServiceStatus === 'error' || extractionAgentStatus === 'error';

    return {
      status: isDegraded ? 'degraded' : 'ok',
      uptime: Math.round(process.uptime()),
      dependencies: {
        database: databaseOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
        aiService: aiServiceStatus,
        extractionAgent: extractionAgentStatus,
      },
      counts,
      serverVersion: '1.0.0',
      nodeVersion: process.version,
      memoryUsageMb: {
        rss: Math.round(mem.rss / (1024 * 1024)),
        heapTotal: Math.round(mem.heapTotal / (1024 * 1024)),
        heapUsed: Math.round(mem.heapUsed / (1024 * 1024)),
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await db.execute(sql`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async checkAiService(): Promise<'ok' | 'error' | 'unconfigured'> {
    if (!env.AI_SERVICE_BASE_URL) return 'unconfigured';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      let res = await fetch(`${env.AI_SERVICE_BASE_URL}/v1/health`, { signal: controller.signal }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${env.AI_SERVICE_BASE_URL}/health`, { signal: controller.signal }).catch(() => null);
      }
      clearTimeout(timeout);
      if (res && res.ok) return 'ok';

      void aiJobLogger.logFailure({
        serviceName: 'FastAPI AI Microservice (/v1/health)',
        taskType: 'service_health_probe',
        status: 'failed',
        errorMessage: `AI microservice returned HTTP status ${res ? String(res.status) : 'unreachable'}`,
        metadata: { url: env.AI_SERVICE_BASE_URL },
      });
      return 'error';
    } catch {
      void aiJobLogger.logFailure({
        serviceName: 'FastAPI AI Microservice (/v1/health)',
        taskType: 'service_health_probe',
        status: 'failed',
        errorMessage: 'AI microservice connection timed out or network error',
        metadata: { url: env.AI_SERVICE_BASE_URL },
      });
      return 'error';
    }
  }

  private async checkExtractionAgent(): Promise<'ok' | 'error' | 'unconfigured'> {
    const webhookUrl = env.N8N_EXTRACTION_WEBHOOK_URL?.trim();
    if (!webhookUrl) return 'unconfigured';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(webhookUrl, {
        method: 'GET',
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);

      if (!res) return 'error';
      // Cloudflare error pages for dead or disconnected tunnels return 530, 502, 504
      if (res.status === 530 || res.status === 502 || res.status === 504) {
        return 'error';
      }
      return 'ok';
    } catch {
      return 'error';
    }
  }

  private async fetchEntityCounts(): Promise<AdminHealthStatus['counts']> {
    try {
      const [totalUsersRes, activeUsersRes, pendingDraftsRes, failedAiJobsRes] = await Promise.all([
        db.select({ count: count() }).from(schema.users),
        db.select({ count: count() }).from(schema.users).where(eq(schema.users.isActive, true)),
        db
          .select({ count: count() })
          .from(schema.opportunityDrafts)
          .where(eq(schema.opportunityDrafts.status, 'pending_review')),
        db
          .select({ count: count() })
          .from(schema.aiExtractionRuns)
          .where(eq(schema.aiExtractionRuns.status, 'failed')),
      ]);

      return {
        totalUsers: Number(totalUsersRes[0]?.count ?? 0),
        activeUsers: Number(activeUsersRes[0]?.count ?? 0),
        pendingDrafts: Number(pendingDraftsRes[0]?.count ?? 0),
        failedAiJobs: Number(failedAiJobsRes[0]?.count ?? 0),
      };
    } catch {
      return {
        totalUsers: 0,
        activeUsers: 0,
        pendingDrafts: 0,
        failedAiJobs: 0,
      };
    }
  }
}
