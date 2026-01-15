import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AuthGuard from './components/AuthGuard';
import RecordDecisionPage from './pages/RecordDecisionPage';

/**
 * App component with route configuration
 *
 * Routes:
 * - /login : Login page (public)
 * - /signup : Signup page (public)
 * - /dashboard : Dashboard page (protected)
 * - /record : Record decision page (protected)
 * - * : Redirects to /dashboard
 *
 * AuthProvider is configured in main.tsx to wrap the entire app.
 */
function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes - wrapped in AuthGuard */}
      <Route element={<AuthGuard />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/record" element={<RecordDecisionPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
