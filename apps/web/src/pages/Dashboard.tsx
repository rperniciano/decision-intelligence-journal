import { useState } from 'react';
import { useAuth, type AuthError } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handleLogout = async () => {
    setError(null);
    setIsLoggingOut(true);

    try {
      await signOut();
      // Navigation will happen via AuthGuard after session is cleared
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || 'Errore durante il logout. Riprova.');
      setIsLoggingOut(false);
    }
  };

  // Get display name from user email (use the part before @)
  const displayName = user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-gray-900">Decision Intelligence Journal</h1>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-gray-600 sm:block">
              Ciao, <span className="font-medium">{displayName}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoggingOut ? <LoadingSpinner size="sm" /> : 'Esci'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        {error && (
          <div
            className="mb-8 w-full max-w-md rounded-md bg-red-50 p-4"
            role="alert"
            aria-live="polite"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          {/* Mobile-only welcome message */}
          <p className="mb-4 text-sm text-gray-600 sm:hidden">
            Ciao, <span className="font-medium">{displayName}</span>
          </p>

          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Dashboard</h2>
          <p className="mt-2 text-lg text-gray-600">Coming soon</p>
          <p className="mt-4 max-w-md text-sm text-gray-500">
            We&apos;re working hard to bring you powerful decision intelligence tools. Check back
            soon for journal entries, decision tracking, and insights.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            {user?.email && (
              <span>
                Signed in as <span className="font-medium text-gray-700">{user.email}</span>
              </span>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
}
