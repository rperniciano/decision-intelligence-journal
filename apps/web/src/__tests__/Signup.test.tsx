import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Signup from '../pages/Signup';
import { AuthProvider } from '../contexts/AuthContext';
import type { User, Session } from '@decisions/supabase';

// Mock Supabase client
const mockGetSession = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signUp: (
        opts: { email: string; password: string; options?: { data?: { display_name?: string } } }
      ) => mockSignUp(opts),
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

// Helper to render Signup with providers
function renderSignup(initialEntries = ['/signup']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Signup />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Signup Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockOnAuthStateChange.mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
    mockSignUp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });
    mockSignInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://google.com/oauth' },
      error: null,
    });
  });

  describe('Rendering', () => {
    it('renders the signup page with app logo and name', async () => {
      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /decision journal/i })).toBeInTheDocument();
      });

      // Check for subtitle
      expect(screen.getByText(/crea il tuo account/i)).toBeInTheDocument();
    });

    it('renders name field marked as optional', async () => {
      renderSignup();

      await waitFor(() => {
        expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
      });

      // Check for (opzionale) text
      expect(screen.getByText(/opzionale/i)).toBeInTheDocument();
    });

    it('renders email, password, and confirm password fields', async () => {
      renderSignup();

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });

      // Use getByLabelText with exact match or query by placeholder for password fields
      const passwordInputs = screen.getAllByLabelText(/password/i);
      expect(passwordInputs.length).toBe(2); // Password and Confirm Password
    });

    it('renders create account button with Italian text', async () => {
      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });
    });

    it('renders Google signup button with Italian text', async () => {
      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /registrati con google/i })).toBeInTheDocument();
      });
    });

    it('renders login link with Italian text', async () => {
      renderSignup();

      await waitFor(() => {
        expect(screen.getByText(/hai già un account\?/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('link', { name: /accedi/i })).toBeInTheDocument();
    });

    it('login link navigates to /login', async () => {
      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /accedi/i })).toBeInTheDocument();
      });

      const link = screen.getByRole('link', { name: /accedi/i });
      expect(link).toHaveAttribute('href', '/login');
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

      renderSignup();

      // Should show loading spinner initially
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows loading spinner on submit button during sign up', async () => {
      const user = userEvent.setup();

      // Delay sign up response
      mockSignUp.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { user: mockUser, session: mockSession }, error: null }),
              200
            )
          )
      );

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Button should show loading state
      await waitFor(() => {
        expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('shows error message for already registered email', async () => {
      const user = userEvent.setup();

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText(/esiste già un account/i)).toBeInTheDocument();
    });

    it('shows network error message for connection issues', async () => {
      const user = userEvent.setup();

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'network error: fetch failed' },
      });

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
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

      renderSignup();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /registrati con google/i })
        ).toBeInTheDocument();
      });

      const googleButton = screen.getByRole('button', { name: /registrati con google/i });
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
        <MemoryRouter initialEntries={['/signup']}>
          <AuthProvider>
            <Signup />
          </AuthProvider>
        </MemoryRouter>
      );

      // Wait for auth state to resolve
      await waitFor(() => {
        // Signup form should not be visible when redirecting
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows error when email is empty', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      // Only fill passwords, leave email empty
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Should show email validation error
      await waitFor(() => {
        expect(screen.getByText(/email obbligatoria/i)).toBeInTheDocument();
      });

      // signUp should NOT be called
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows error when email format is invalid', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      // Use email that passes native validation but fails our custom regex
      await user.type(emailInput, 'test@domain');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Should show email format error
      await waitFor(() => {
        expect(screen.getByText(/inserisci un'email valida/i)).toBeInTheDocument();
      });

      // signUp should NOT be called
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows error when password is empty', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      // Only fill email, leave passwords empty
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      // Should show password validation error
      await waitFor(() => {
        expect(screen.getByText(/password obbligatoria/i)).toBeInTheDocument();
      });

      // signUp should NOT be called
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows error when password is less than 8 characters', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'pass1'); // Only 5 characters
      await user.type(confirmPasswordInput, 'pass1');
      await user.click(submitButton);

      // Should show password length error
      await waitFor(() => {
        expect(screen.getByText(/almeno 8 caratteri/i)).toBeInTheDocument();
      });

      // signUp should NOT be called
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows error when password does not contain a number', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password'); // No number
      await user.type(confirmPasswordInput, 'password');
      await user.click(submitButton);

      // Should show password number error
      await waitFor(() => {
        expect(screen.getByText(/almeno un numero/i)).toBeInTheDocument();
      });

      // signUp should NOT be called
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows error when confirm password is empty', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show confirm password validation error
      await waitFor(() => {
        expect(screen.getByText(/conferma la password/i)).toBeInTheDocument();
      });

      // signUp should NOT be called
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'different123');
      await user.click(submitButton);

      // Should show password mismatch error
      await waitFor(() => {
        expect(screen.getByText(/le password non corrispondono/i)).toBeInTheDocument();
      });

      // signUp should NOT be called
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('clears email error when user starts typing', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      // Submit with empty email to trigger error
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email obbligatoria/i)).toBeInTheDocument();
      });

      // Start typing in email field
      await user.type(emailInput, 't');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/email obbligatoria/i)).not.toBeInTheDocument();
      });
    });

    it('clears password error when user starts typing', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      // Submit with empty password to trigger error
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password obbligatoria/i)).toBeInTheDocument();
      });

      // Start typing in password field
      await user.type(passwordInput, 'p');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/password obbligatoria/i)).not.toBeInTheDocument();
      });
    });

    it('allows valid form submission after fixing validation errors', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      // Submit with empty form first
      await user.click(submitButton);

      // Verify errors are shown
      await waitFor(() => {
        expect(screen.getByText(/email obbligatoria/i)).toBeInTheDocument();
        expect(screen.getByText(/password obbligatoria/i)).toBeInTheDocument();
      });

      // Enter valid data
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Should call signUp
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          options: undefined,
        });
      });
    });
  });

  describe('Form Submission', () => {
    it('calls signUp with correct credentials on form submit', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'mypassword123');
      await user.type(confirmPasswordInput, 'mypassword123');
      await user.click(submitButton);

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'mypassword123',
        options: undefined,
      });
    });

    it('calls signUp with display name when provided', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/nome/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });

      await user.type(nameInput, 'Mario Rossi');
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'mypassword123');
      await user.type(confirmPasswordInput, 'mypassword123');
      await user.click(submitButton);

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'mypassword123',
        options: {
          data: {
            display_name: 'Mario Rossi',
          },
        },
      });
    });

    it('calls signInWithOAuth when Google button is clicked', async () => {
      const user = userEvent.setup();

      renderSignup();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /registrati con google/i })
        ).toBeInTheDocument();
      });

      const googleButton = screen.getByRole('button', { name: /registrati con google/i });
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

      // Delay sign up response
      mockSignUp.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ data: { user: mockUser, session: mockSession }, error: null }),
              200
            )
          )
      );

      renderSignup();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /crea account/i })).toBeInTheDocument();
      });

      const nameInput = screen.getByLabelText(/nome/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/conferma password/i);
      const submitButton = screen.getByRole('button', { name: /crea account/i });
      const googleButton = screen.getByRole('button', { name: /registrati con google/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Inputs should be disabled during submission
      await waitFor(() => {
        expect(nameInput).toBeDisabled();
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
        expect(confirmPasswordInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
        expect(googleButton).toBeDisabled();
      });
    });
  });
});
