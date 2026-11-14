import type { AuthenticatedUser, RoleName } from '@career-portal/shared-types';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';

import { authReducer, type AuthState } from './auth-slice';
import {
  useHasAnyPermission,
  useHasAnyRole,
  useHasPermission,
  useHasRole,
} from './use-permission';

function createMockStore(authState: Partial<AuthState> = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null,
        ...authState,
      },
    },
  });
}

function createWrapper(store: ReturnType<typeof createMockStore>) {
  return function StoreWrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

const mockStudentUser: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'student@example.com',
  fullName: 'Alice Student',
  roles: ['STUDENT'],
  permissions: ['profile.view', 'applications.create', 'opportunities.view'],
};

const mockFacultyUser: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000002',
  email: 'faculty@example.com',
  fullName: 'Dr. Faculty',
  roles: ['PLACEMENT_FACULTY'],
  permissions: ['opportunities.create', 'opportunities.manage', 'notices.create'],
};

const mockAdminUser: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000003',
  email: 'admin@example.com',
  fullName: 'Super Admin',
  roles: ['ADMIN'],
  permissions: ['admin.manage', 'users.manage', 'audit.view'],
};

describe('use-permission hooks', () => {
  describe('useHasPermission', () => {
    it('returns true when user has the permission', () => {
      const store = createMockStore({
        user: mockStudentUser,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useHasPermission('profile.view'), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(true);
    });

    it('returns false when user is missing the permission', () => {
      const store = createMockStore({
        user: mockStudentUser,
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useHasPermission('admin.manage'), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });
  });

  describe('useHasRole checks', () => {
    it('verifies STUDENT role correctly', () => {
      const store = createMockStore({
        user: mockStudentUser,
        isAuthenticated: true,
      });

      const { result: isStudent } = renderHook(() => useHasRole('STUDENT'), {
        wrapper: createWrapper(store),
      });
      const { result: isFaculty } = renderHook(() => useHasRole('PLACEMENT_FACULTY'), {
        wrapper: createWrapper(store),
      });
      const { result: isAdmin } = renderHook(() => useHasRole('ADMIN'), {
        wrapper: createWrapper(store),
      });

      expect(isStudent.current).toBe(true);
      expect(isFaculty.current).toBe(false);
      expect(isAdmin.current).toBe(false);
    });

    it('verifies PLACEMENT_FACULTY role correctly', () => {
      const store = createMockStore({
        user: mockFacultyUser,
        isAuthenticated: true,
      });

      const { result: isFaculty } = renderHook(() => useHasRole('PLACEMENT_FACULTY'), {
        wrapper: createWrapper(store),
      });
      const { result: isStudent } = renderHook(() => useHasRole('STUDENT'), {
        wrapper: createWrapper(store),
      });

      expect(isFaculty.current).toBe(true);
      expect(isStudent.current).toBe(false);
    });

    it('verifies ADMIN role correctly', () => {
      const store = createMockStore({
        user: mockAdminUser,
        isAuthenticated: true,
      });

      const { result: isAdmin } = renderHook(() => useHasRole('ADMIN'), {
        wrapper: createWrapper(store),
      });
      const { result: isStudent } = renderHook(() => useHasRole('STUDENT'), {
        wrapper: createWrapper(store),
      });

      expect(isAdmin.current).toBe(true);
      expect(isStudent.current).toBe(false);
    });
  });

  describe('Guest user (unauthenticated)', () => {
    it('has no permissions and no roles when unauthenticated', () => {
      const store = createMockStore({
        user: null,
        isAuthenticated: false,
      });

      const { result: hasPerm } = renderHook(() => useHasPermission('profile.view'), {
        wrapper: createWrapper(store),
      });
      const { result: hasRole } = renderHook(() => useHasRole('STUDENT'), {
        wrapper: createWrapper(store),
      });
      const { result: hasAnyPerm } = renderHook(
        () => useHasAnyPermission('profile.view', 'opportunities.view'),
        { wrapper: createWrapper(store) },
      );
      const { result: hasAnyRole } = renderHook(
        () => useHasAnyRole('STUDENT', 'ADMIN'),
        { wrapper: createWrapper(store) },
      );

      expect(hasPerm.current).toBe(false);
      expect(hasRole.current).toBe(false);
      expect(hasAnyPerm.current).toBe(false);
      expect(hasAnyRole.current).toBe(false);
    });
  });

  describe('Multiple permission and role checks', () => {
    it('useHasAnyPermission returns true if any requested permission is held', () => {
      const store = createMockStore({
        user: mockStudentUser,
        isAuthenticated: true,
      });

      const { result: matchFirst } = renderHook(
        () => useHasAnyPermission('profile.view', 'non.existent'),
        { wrapper: createWrapper(store) },
      );
      const { result: matchNone } = renderHook(
        () => useHasAnyPermission('admin.manage', 'non.existent'),
        { wrapper: createWrapper(store) },
      );

      expect(matchFirst.current).toBe(true);
      expect(matchNone.current).toBe(false);
    });

    it('useHasAnyRole returns true if any requested role is held', () => {
      const store = createMockStore({
        user: mockStudentUser,
        isAuthenticated: true,
      });

      const { result: matchOne } = renderHook(
        () => useHasAnyRole('ADMIN', 'STUDENT'),
        { wrapper: createWrapper(store) },
      );
      const { result: matchNone } = renderHook(
        () => useHasAnyRole('ADMIN', 'PLACEMENT_FACULTY'),
        { wrapper: createWrapper(store) },
      );

      expect(matchOne.current).toBe(true);
      expect(matchNone.current).toBe(false);
    });
  });
});
