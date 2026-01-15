import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AuthGuard from './components/AuthGuard';
import VoiceCapture from './pages/VoiceCapture';

/**
 * Home page component
 * Landing page with project info
 */
function HomePage() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

/**
 * App component with route configuration
 *
 * Routes:
 * - / : Home page (public)
 * - /record : Voice recording page (protected by AuthGuard)
 */
function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />

      {/* Protected routes - wrapped in AuthGuard */}
      <Route element={<AuthGuard />}>
        <Route path="/record" element={<VoiceCapture />} />
      </Route>
    </Routes>
  );
}

export default App;
