import type { RoleName } from '@career-portal/shared-types';
import { Loader2 } from 'lucide-react';
import { Navigate, useLocation } from 'react-router';


import { useAuth } from '@/features/auth/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: RoleName | RoleName[];
  requiredPermission?: string;
}

/**
 * Route guard that redirects unauthenticated users to /login.
 * Optionally enforces a specific role or permission.
 * Shows a loading skeleton while the initial auth check completes.
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
}: ProtectedRouteProps): React.JSX.Element {
  const { isAuthenticated, isInitialized, isLoading, user } = useAuth();
  const location = useLocation();

  // Still checking initial session
  if (!isInitialized || (!user && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (requiredRole) {
    const hasRole = Array.isArray(requiredRole)
      ? requiredRole.some((r) => user?.roles.includes(r))
      : user?.roles.includes(requiredRole);
    if (!hasRole) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
            <p className="mt-2 text-slate-500">
              You don&apos;t have the required role to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  // Permission check
  if (requiredPermission && !user?.permissions.includes(requiredPermission)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="mt-2 text-slate-500">
            You don&apos;t have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
