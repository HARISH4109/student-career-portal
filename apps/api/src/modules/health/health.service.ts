import { db } from '@career-portal/db';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  uptime: number;
  dependencies: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
}

/**
 * Business/application layer for the health module. Even a "trivial" module
 * follows the same controller -> service -> (infrastructure) separation as
 * every other module, so the pattern is consistent across the codebase.
 */
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
}
