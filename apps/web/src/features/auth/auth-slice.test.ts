import type { AuthenticatedUser, AuthTokens } from '@career-portal/shared-types';
import { describe, expect, it } from 'vitest';

import {
  authReducer,
  clearAuth,
  clearError,
  fetchMe,
  setInitialized,
  setTokens,
  setUser,
  type AuthState,
} from './auth-slice';

describe('authSlice reducer', () => {
  const initial: AuthState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    error: null,
  };

  const dummyUser: AuthenticatedUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'student@uni.edu',
    fullName: 'Test Student',
    roles: ['STUDENT'],
    permissions: ['opportunities.view', 'applications.apply'],
  };

  const dummyTokens: AuthTokens = {
    accessToken: 'access-123',
    refreshToken: 'refresh-123',
    expiresAt: 1234567890,
  };

  it('ignores a profile request that finishes after sign-out', () => {
    const loading = authReducer(initial, fetchMe.pending('old-request', undefined));
    const signedOut = authReducer(loading, clearAuth());
    const result = authReducer(signedOut, fetchMe.fulfilled(dummyUser, 'old-request', undefined));
    expect(result.isAuthenticated).toBe(false);
    expect(result.user).toBeNull();
  });

  it('handles setInitialized', () => {
    const state = authReducer(initial, setInitialized());
    expect(state.isInitialized).toBe(true);
  });

  it('handles setUser', () => {
    const state = authReducer(initial, setUser(dummyUser));
    expect(state.user).toEqual(dummyUser);
    expect(state.isAuthenticated).toBe(true);

    const clearedState = authReducer(state, setUser(null));
    expect(clearedState.user).toBeNull();
    expect(clearedState.isAuthenticated).toBe(false);
  });

  it('handles setTokens', () => {
    const state = authReducer(initial, setTokens(dummyTokens));
    expect(state.tokens).toEqual(dummyTokens);
  });

  it('handles clearAuth', () => {
    const populated: AuthState = {
      user: dummyUser,
      tokens: dummyTokens,
      isAuthenticated: true,
      isLoading: false,
      isInitialized: true,
      error: 'Some error',
    };

    const state = authReducer(populated, clearAuth());
    expect(state.user).toBeNull();
    expect(state.tokens).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBeNull();
    expect(state.isInitialized).toBe(true);
  });

  it('handles clearError', () => {
    const withError: AuthState = { ...initial, error: 'Auth failed' };
    const state = authReducer(withError, clearError());
    expect(state.error).toBeNull();
  });
  it('does not set isLoading to true on fetchMe.pending when user is already authenticated', () => {
    const authenticated: AuthState = {
      ...initial,
      user: dummyUser,
      isAuthenticated: true,
      isLoading: false,
    };
    const nextState = authReducer(authenticated, fetchMe.pending('background-refresh', undefined));
    expect(nextState.isLoading).toBe(false);
  });
});
