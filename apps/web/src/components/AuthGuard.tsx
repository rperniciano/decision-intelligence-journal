import { type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  /** The children to render when authenticated */
  children: ReactNode;
  /** Optional redirect path (defaults to /login) */
  redirectTo?: string;
}

/**
 * ProtectedRoute component that wraps children.
 * Redirects to login if not authenticated.
 * Shows loading state while checking auth.
 *
 * Usage:
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 */
export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated, using replace to prevent back-button issues
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
}

/**
 * AuthGuard protects routes that require authentication.
 * Uses React Router v6 Outlet pattern for nested route rendering.
 *
 * Usage in router:
 * <Route element={<AuthGuard />}>
 *   <Route path="/dashboard" element={<Dashboard />} />
 * </Route>
 */
export function AuthGuard() {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated, using replace to prevent back-button issues
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Render nested routes if authenticated
  return <Outlet />;
}

export default AuthGuard;
