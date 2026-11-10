import path from 'node:path';

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

config({ path: path.resolve(process.cwd(), '../../.env') });
config({ path: path.resolve(process.cwd(), '.env') });

import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

/**
 * Connection pool tuned for a server-side long-running process (Express API).
 * `max` kept conservative since Supabase's pooled connection limits are shared
 * across all services hitting the same project.
 */
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema, logger: process.env.NODE_ENV === 'development' });

export type Database = typeof db;
export * as schema from './schema';
