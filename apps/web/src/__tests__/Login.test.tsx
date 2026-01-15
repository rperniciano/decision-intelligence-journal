import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthProvider } from '../contexts/AuthContext';
import type { User, Session } from '@decisions/supabase';

// Mock Supabase client
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInWithPassword: (creds: { email: string; password: string }) =>
        mockSignInWithPassword(creds),
      signInWithOAuth: (opts: { provider: string; options?: { redirectTo?: string } }) =>
        mockSignInWithOAuth(opts),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: (
        callback: (
          event: 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT',
          session: Session | null
        ) => void
      ) => mockOnAuthStateChange(callback),
    },
  },
}));

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

// Helper to render Login with providers
function renderLogin(initialEntries = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    mockSignInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://google.com/oauth' },
      error: null,
    });
  });

  describe('Rendering', () => {
    it('renders the login page with app logo and name', async () => {
      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /decision journal/i })).toBeInTheDocument();
      });

      // Check for subtitle
      expect(screen.getByText(/accedi al tuo account/i)).toBeInTheDocument();
    });

    it('renders email and password fields', async () => {
      renderLogin();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders login button with Italian text', async () => {
      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^accedi$/i })).toBeInTheDocument();
      });
    });

    it('renders Google login button with Italian text', async () => {
      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accedi con google/i })).toBeInTheDocument();
      });
    });

    it('renders registration link with Italian text', async () => {
      renderLogin();

      await waitFor(() => {
        expect(screen.getByText(/non hai un account\?/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('link', { name: /registrati/i })).toBeInTheDocument();
    });

    it('registration link navigates to /signup', async () => {
      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /registrati/i })).toBeInTheDocument();
      });

      const link = screen.getByRole('link', { name: /registrati/i });
      expect(link).toHaveAttribute('href', '/signup');
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner while checking auth state', async () => {
      // Delay getSession response to observe loading state
      mockGetSession.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { session: null }, error: null }), 100)
          )
      );

      renderLogin();

      // Should show loading spinner initially
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows loading spinner on submit button during sign in', async () => {
      const user = userEvent.setup();

      // Delay sign in response
      mockSignInWithPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { user: mockUser, session: mockSession }, error: null }),
              200
            )
          )
      );

      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^accedi$/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^accedi$/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Button should show loading state
      await waitFor(() => {
        expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message for invalid credentials', async () => {
      const user = userEvent.setup();

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^accedi$/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^accedi$/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrong-password');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText(/email o password non validi/i)).toBeInTheDocument();
    });

    it('shows network error message for connection issues', async () => {
      const user = userEvent.setup();

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'network error: fetch failed' },
      });

      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^accedi$/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^accedi$/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText(/errore di connessione/i)).toBeInTheDocument();
    });

    it('shows error for Google OAuth failure', async () => {
      const user = userEvent.setup();

      mockSignInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'OAuth error' },
      });

      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accedi con google/i })).toBeInTheDocument();
      });

      const googleButton = screen.getByRole('button', { name: /accedi con google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('Redirect Behavior', () => {
    it('redirects to dashboard when user is already authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </MemoryRouter>
      );

      // Wait for auth state to resolve
      await waitFor(() => {
        // Login form should not be visible when redirecting
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('calls signInWithPassword with correct credentials on form submit', async () => {
      const user = userEvent.setup();

      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^accedi$/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^accedi$/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'mypassword123');
      await user.click(submitButton);

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'mypassword123',
      });
    });

    it('calls signInWithOAuth when Google button is clicked', async () => {
      const user = userEvent.setup();

      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /accedi con google/i })).toBeInTheDocument();
      });

      const googleButton = screen.getByRole('button', { name: /accedi con google/i });
      await user.click(googleButton);

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/dashboard'),
        },
      });
    });

    it('disables form inputs during submission', async () => {
      const user = userEvent.setup();

      // Delay sign in response
      mockSignInWithPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { user: mockUser, session: mockSession }, error: null }),
              200
            )
          )
      );

      renderLogin();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^accedi$/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /^accedi$/i });
      const googleButton = screen.getByRole('button', { name: /accedi con google/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Inputs should be disabled during submission
      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
        expect(googleButton).toBeDisabled();
      });
    });
  });
});
