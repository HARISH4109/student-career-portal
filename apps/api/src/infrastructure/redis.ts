import Redis from 'ioredis';

import { env } from '@/config/env';
import { logger } from '@/infrastructure/logger';

/**
 * Shared Redis singleton. Every module that needs Redis (health checks,
 * permission caching, rate-limit stores, etc.) imports this instance
 * instead of creating its own connection.
 */
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

/** Cache key helpers for consistent namespacing */
export const CacheKeys = {
  userPermissions: (userId: string) => `user:${userId}:permissions` as const,
  userSession: (userId: string) => `user:${userId}:session` as const,
} as const;

/** Default TTL for user permission cache (5 minutes) */
export const PERMISSIONS_CACHE_TTL = 300;
