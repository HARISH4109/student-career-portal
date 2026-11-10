import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/env';

/**
 * Server-side Supabase admin client using the service_role key.
 * This bypasses RLS (by design — see ARCHITECTURE.md §10) because
 * authorization is enforced at the Express middleware and service layers.
 *
 * NEVER expose this client or the service_role key to the frontend.
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

// Auth sessions are request-local: signing in must never mutate the admin singleton.
export function createAuthClient(): ReturnType<typeof createClient> {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
