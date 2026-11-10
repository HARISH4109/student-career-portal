import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    maxWorkers: 2,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'fatal',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/career_portal_test',
      REDIS_URL: 'redis://localhost:6379',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      SUPABASE_ANON_KEY: 'test-anon-key',
      JWT_SECRET: 'test-secret-at-least-16-chars',
      AI_SERVICE_BASE_URL: 'http://localhost:8000',
      AI_SERVICE_INTERNAL_TOKEN: 'test-internal-token',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
