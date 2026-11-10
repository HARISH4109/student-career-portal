import type { RoleName } from '@career-portal/shared-types';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';


import type { AppDispatch, RootState } from '@/app/store';
import {
  clearError,
  fetchMe,
  signIn,
  signOut,
  signUp,
} from '@/features/auth/auth-slice';

/**
 * Primary auth hook for components. Wraps Redux dispatch + selectors
 * into a clean, ergonomic API.
 *
 * Usage:
 *   const { user, isAuthenticated, signIn, signOut } = useAuth();
 */
export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated, isLoading, isInitialized, error } = useSelector(
    (state: RootState) => state.auth,
  );

  const handleSignIn = useCallback(
    (email: string, password: string) => dispatch(signIn({ email, password })),
    [dispatch],
  );

  const handleSignUp = useCallback(
    (email: string, password: string, fullName: string, role?: RoleName) =>
      dispatch(signUp({ email, password, fullName, ...(role ? { role } : {}) })),
    [dispatch],
  );

  const handleSignOut = useCallback(() => dispatch(signOut()), [dispatch]);

  const handleFetchMe = useCallback(() => dispatch(fetchMe()), [dispatch]);

  const handleClearError = useCallback(() => dispatch(clearError()), [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    fetchMe: handleFetchMe,
    clearError: handleClearError,
  };
}
