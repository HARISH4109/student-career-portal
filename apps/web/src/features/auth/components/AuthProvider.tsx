import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { queryClient } from '@/app/query-client';
import type { AppDispatch } from '@/app/store';
import { clearAuth, fetchMe, setInitialized, setTokens } from '@/features/auth/auth-slice';
import { supabase } from '@/shared/lib/supabase';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Bootstraps auth state on app mount:
 * 1. Checks for an existing Supabase session (from localStorage / URL hash)
 * 2. If session exists, hydrates user context from our API
 * 3. Subscribes to auth state changes (token refresh, sign out from other tabs)
 *
 * Renders children only after initial check completes (prevents flash of login page).
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session && mounted) {
          // Persist token for apiClient interceptor
          localStorage.setItem('supabase_access_token', session.access_token);

          dispatch(
            setTokens({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
              expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
            }),
          );

          // Hydrate user roles/permissions from our API
          await dispatch(fetchMe());
        }
      } catch {
        // Session check failed — user is not authenticated
        localStorage.removeItem('supabase_access_token');
        dispatch(clearAuth());
      } finally {
        if (mounted) {
          dispatch(setInitialized());
        }
      }
    };

    void initAuth();

    // Listen for auth state changes (token refresh, sign out from other tab, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_OUT' || !session) {
          queryClient.clear();
          localStorage.removeItem('supabase_access_token');
          dispatch(clearAuth());
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          localStorage.setItem('supabase_access_token', session.access_token);
          dispatch(
            setTokens({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
              expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
            }),
          );

          // Re-hydrate user context
          void dispatch(fetchMe());
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}
