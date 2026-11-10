import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

/**
 * Browser-side Supabase client using the anon key. Used for:
 * - Auth flows (signUp, signIn, signOut, password reset)
 * - Token management (session persistence, refresh)
 * - Real-time subscriptions (Phase 5)
 *
 * Data access goes through our Express API, NOT directly through this client.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // For OAuth & password reset redirects
  },
});
