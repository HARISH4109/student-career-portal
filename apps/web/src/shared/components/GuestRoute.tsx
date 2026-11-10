import { Navigate } from 'react-router';

import { useAuth } from '@/features/auth/use-auth';

interface GuestRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard for auth pages (login, register). Redirects already-
 * authenticated users to the dashboard so they don't see the login
 * form unnecessarily.
 */
export function GuestRoute({ children }: GuestRouteProps): React.JSX.Element {
  const { isAuthenticated, isInitialized } = useAuth();

  // While auth state is loading, show the guest page (avoids flash)
  if (!isInitialized) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
