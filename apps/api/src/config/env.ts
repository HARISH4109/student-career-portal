import path from 'node:path';

import { config } from 'dotenv';
import { z } from 'zod';

config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

/**
 * All environment access in the API goes through this module — never
 * `process.env.X` scattered across the codebase. Failing fast on a missing/
 * malformed var at boot is far cheaper than failing deep inside a request
 * handler in production.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_BASE_URL: z.string().url().default('http://localhost:5173'),

  DATABASE_URL: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),

  JWT_SECRET: z.string().min(16),

  REDIS_URL: z.string().url(),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((val) => val.split(',').map((origin) => origin.trim()).filter(Boolean)),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  AI_SERVICE_BASE_URL: z.string().url(),
  AI_SERVICE_INTERNAL_TOKEN: z.string().min(1),

  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  N8N_EXTRACTION_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
     
    console.error('❌ Invalid environment configuration:');
     
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
