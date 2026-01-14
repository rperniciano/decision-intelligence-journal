/**
 * AuthGuard component
 *
 * Wraps protected routes to ensure user is authenticated.
 * Currently a pass-through component (auth not yet implemented).
 *
 * Future implementation will:
 * - Check authentication state from AuthContext
 * - Redirect to login if not authenticated
 * - Show loading state while checking auth
 *
 * @example
 * ```tsx
 * // In route configuration
 * <Route element={<AuthGuard />}>
 *   <Route path="/dashboard" element={<Dashboard />} />
 *   <Route path="/record" element={<VoiceCapture />} />
 * </Route>
 * ```
 */

import { Outlet } from 'react-router-dom';

/**
 * AuthGuard wraps protected routes
 *
 * Currently renders children directly (auth not implemented).
 * Will be updated to check auth state and redirect when auth is added.
 */
export default function AuthGuard() {
  // TODO: Implement auth check when AuthContext is available
  // const { isAuthenticated, isLoading } = useAuth();
  //
  // if (isLoading) {
  //   return <LoadingSpinner />;
  // }
  //
  // if (!isAuthenticated) {
  //   return <Navigate to="/login" replace />;
  // }

  return <Outlet />;
}
