import { Routes, Route } from 'react-router-dom';
import type { Decision, DecisionStatus } from '@decisions/shared';
import AuthGuard from './components/AuthGuard';
import VoiceCapture from './pages/VoiceCapture';

/**
 * Example decision to demonstrate shared types integration
 */
const exampleDecision: Pick<Decision, 'id' | 'title' | 'status'> = {
  id: 'example-1',
  title: 'Welcome to Decisions',
  status: 'in_progress' as DecisionStatus,
};

/**
 * Home page component
 * Landing page with project info
 */
function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          {exampleDecision.title}
        </h1>
        <p className="text-slate-300 mb-6">
          Decision Intelligence Journal
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-700/50 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm">
            Status: {exampleDecision.status.replace('_', ' ')}
          </span>
        </div>
        <div className="mt-8 text-slate-500 text-sm">
          <p>React 18 + TypeScript + Vite + Tailwind CSS</p>
          <p className="mt-1">@decisions/shared types integrated</p>
        </div>
      </div>
    </div>
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
