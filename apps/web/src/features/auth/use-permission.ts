import type { RoleName } from '@career-portal/shared-types';
import { useSelector } from 'react-redux';


import type { RootState } from '@/app/store';

/**
 * Check if the current user has a specific permission.
 *
 * Usage:
 *   const canCreate = useHasPermission('opportunities.create');
 *   if (canCreate) { ... }
 */
export function useHasPermission(permission: string): boolean {
  return useSelector((state: RootState) =>
    state.auth.user?.permissions.includes(permission) ?? false,
  );
}

/**
 * Check if the current user has ANY of the listed permissions.
 */
export function useHasAnyPermission(...permissions: string[]): boolean {
  return useSelector((state: RootState) =>
    permissions.some((p) => state.auth.user?.permissions.includes(p) ?? false),
  );
}

/**
 * Check if the current user has a specific role.
 *
 * Usage:
 *   const isAdmin = useHasRole('ADMIN');
 */
export function useHasRole(role: RoleName): boolean {
  return useSelector((state: RootState) =>
    state.auth.user?.roles.includes(role) ?? false,
  );
}

/**
 * Check if the current user has ANY of the listed roles.
 */
export function useHasAnyRole(...roles: RoleName[]): boolean {
  return useSelector((state: RootState) =>
    roles.some((r) => state.auth.user?.roles.includes(r) ?? false),
  );
}
