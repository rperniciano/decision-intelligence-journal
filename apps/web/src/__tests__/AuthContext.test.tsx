import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import type { User, Session } from '@decisions/supabase';

// AuthChangeEvent type from Supabase (not exported from @decisions/supabase)
type AuthChangeEvent =
  | 'INITIAL_SESSION'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY';

// Mock Supabase client
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInWithPassword: (creds: { email: string; password: string }) =>
        mockSignInWithPassword(creds),
      signUp: (creds: { email: string; password: string }) => mockSignUp(creds),
      signInWithOAuth: (opts: { provider: string; options?: { redirectTo?: string } }) =>
        mockSignInWithOAuth(opts),
      signOut: () => mockSignOut(),
      onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) =>
        mockOnAuthStateChange(callback),
    },
  },
}));

// Test component that uses the auth context
function TestConsumer() {
  const { user, session, loading, signIn, signUp, signInWithGoogle, signOut } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="session">{session ? 'has-session' : 'no-session'}</div>
      <button data-testid="sign-in" onClick={() => signIn('test@example.com', 'password123')}>
        Sign In
      </button>
      <button data-testid="sign-up" onClick={() => signUp('test@example.com', 'password123')}>
        Sign Up
      </button>
      <button data-testid="sign-in-google" onClick={() => signInWithGoogle()}>
        Sign In with Google
      </button>
      <button data-testid="sign-out" onClick={() => signOut()}>
        Sign Out
      </button>
    </div>
  );
}

// Create mock user and session
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  refresh_token: 'mock-refresh-token',
  user: mockUser,
};

describe('AuthContext', () => {
  let authStateChangeCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null =
    null;

  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeCallback = null;

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockSignInWithPassword.mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });
    mockSignUp.mockResolvedValue({ data: { user: mockUser, session: mockSession }, error: null });
    mockSignInWithOAuth.mockResolvedValue({ data: { provider: 'google', url: 'https://google.com/oauth' }, error: null });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it('shows loading state initially', async () => {
    // Delay getSession response to observe loading state
    mockGetSession.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: { session: null }, error: null }), 100))
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });

  it('shows no user when not authenticated', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(screen.getByTestId('session')).toHaveTextContent('no-session');
  });

  it('shows user when authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('session')).toHaveTextContent('has-session');
  });

  it('updates state when onAuthStateChange fires', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    // Initially no user
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');

    // Simulate auth state change (user signs in)
    await act(async () => {
      authStateChangeCallback?.('SIGNED_IN' as AuthChangeEvent, mockSession);
    });

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('session')).toHaveTextContent('has-session');
  });

  it('calls signInWithPassword when signIn is called', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    await user.click(screen.getByTestId('sign-in'));

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('calls signUp when signUp is called', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    await user.click(screen.getByTestId('sign-up'));

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('calls signInWithOAuth with google provider when signInWithGoogle is called', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    await user.click(screen.getByTestId('sign-in-google'));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/dashboard'),
      },
    });
  });

  it('calls signOut when signOut is called', async () => {
    const user = userEvent.setup();
    mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    await user.click(screen.getByTestId('sign-out'));

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('throws error when signIn fails', async () => {
    const user = userEvent.setup();
    const mockError = { message: 'Invalid credentials' };
    mockSignInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: mockError });

    let caughtError: { message: string } | null = null;

    // Create a component that catches the error
    function TestConsumerWithErrorHandling() {
      const { signIn } = useAuth();

      const handleSignIn = async () => {
        try {
          await signIn('test@example.com', 'wrong-password');
        } catch (err) {
          // Error is thrown as expected
          caughtError = err as { message: string };
        }
      };

      return (
        <button data-testid="sign-in" onClick={handleSignIn}>
          Sign In
        </button>
      );
    }

    render(
      <AuthProvider>
        <TestConsumerWithErrorHandling />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });

    await user.click(screen.getByTestId('sign-in'));

    expect((caughtError as { message: string } | null)?.message).toBe('Invalid credentials');
  });

  it('unsubscribes from auth state changes on unmount', async () => {
    const mockUnsubscribe = vi.fn();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
