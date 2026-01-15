import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Define mock functions and data at module level
const mockSignOut = vi.fn();

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

const mockSession = {
  access_token: 'test-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer' as const,
  user: mockUser,
};

// Create mock implementation that returns fresh default values
const createDefaultAuthReturn = () => ({
  user: { ...mockUser },
  session: { ...mockSession },
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: mockSignOut,
});

// Mock the AuthContext - using a function that returns a fresh object each time
const mockUseAuth = vi.fn(createDefaultAuthReturn);

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Import after mocking
import Dashboard from '../pages/Dashboard';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default implementation
    mockUseAuth.mockImplementation(createDefaultAuthReturn);
  });

  it('should render loading spinner while checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Should show loading spinner (LoadingSpinner component)
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('should render dashboard header with app title', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Decision Intelligence Journal')).toBeInTheDocument();
  });

  it('should display logout button with Italian text "Esci"', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /esci/i })).toBeInTheDocument();
  });

  it('should display welcome message with user name in Italian', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Welcome message "Ciao, [name]" - may appear multiple times (desktop and mobile)
    const ciaoTexts = screen.getAllByText(/ciao,/i);
    expect(ciaoTexts.length).toBeGreaterThan(0);
    // The email prefix "test" should appear in the welcome message
    const welcomeSpans = screen.getAllByText('test');
    expect(welcomeSpans.length).toBeGreaterThan(0);
  });

  it('should display user email in footer', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should call signOut when logout button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /esci/i });
    await user.click(logoutButton);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('should disable logout button while logging out', async () => {
    const user = userEvent.setup();
    mockSignOut.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /esci/i });
    await user.click(logoutButton);

    // Button should be disabled during logout
    expect(logoutButton).toBeDisabled();
  });

  it('should show loading spinner in button while logging out', async () => {
    const user = userEvent.setup();
    mockSignOut.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /esci/i });
    await user.click(logoutButton);

    // Button should contain spinner (LoadingSpinner component with animate-spin)
    const buttonSpinner = logoutButton.querySelector('.animate-spin');
    expect(buttonSpinner).toBeInTheDocument();
  });

  it('should show error message when logout fails', async () => {
    const user = userEvent.setup();
    mockSignOut.mockRejectedValueOnce(new Error('Logout failed'));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /esci/i });
    await user.click(logoutButton);

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Error message should be visible
    expect(screen.getByText('Logout failed')).toBeInTheDocument();
  });

  it('should show default Italian error message when logout error has no message', async () => {
    const user = userEvent.setup();
    mockSignOut.mockRejectedValueOnce({});

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /esci/i });
    await user.click(logoutButton);

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Default Italian error message
    expect(screen.getByText(/errore durante il logout/i)).toBeInTheDocument();
  });

  it('should re-enable logout button after logout error', async () => {
    const user = userEvent.setup();
    mockSignOut.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const logoutButton = screen.getByRole('button', { name: /esci/i });
    await user.click(logoutButton);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Button should be re-enabled after error
    expect(logoutButton).not.toBeDisabled();
    expect(screen.getByText(/esci/i)).toBeInTheDocument();
  });

  it('should extract display name from email correctly', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // User email is test@example.com, so display name should be "test"
    const welcomeMessages = screen.getAllByText('test');
    expect(welcomeMessages.length).toBeGreaterThan(0);
  });

  it('should use "User" as default display name when email is not available', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, email: undefined },
      session: mockSession,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: mockSignOut,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Should display "User" as default - there may be multiple instances (mobile + desktop)
    const userTexts = screen.getAllByText('User');
    expect(userTexts.length).toBeGreaterThan(0);
  });
});
