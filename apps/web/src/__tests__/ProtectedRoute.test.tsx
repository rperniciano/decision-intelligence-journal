import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute, AuthGuard } from '../components/AuthGuard';
import type { User, Session } from '@decisions/supabase';

// Mock the useAuth hook
const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Helper component to display current location
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
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

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while auth is being checked', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Protected content should not be visible
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <>
                <div data-testid="login-page">Login Page</div>
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to login
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/login');

    // Protected content should not be visible
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to custom path when redirectTo prop is provided', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute redirectTo="/custom-login">
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/custom-login"
            element={
              <>
                <div data-testid="custom-login-page">Custom Login Page</div>
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to custom login path
    await waitFor(() => {
      expect(screen.getByTestId('custom-login-page')).toBeInTheDocument();
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/custom-login');
  });

  it('renders children when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should render protected content
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();

    // Should not redirect to login
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('renders multiple children correctly when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="child-1">Child 1</div>
                <div data-testid="child-2">Child 2</div>
                <div data-testid="child-3">Child 3</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // All children should be rendered
    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('uses useAuth hook correctly', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // useAuth should have been called
    expect(mockUseAuth).toHaveBeenCalled();
  });
});

describe('AuthGuard (Outlet pattern)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while auth is being checked', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/protected" element={<div data-testid="protected-content">Protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/protected" element={<div data-testid="protected-content">Protected</div>} />
          </Route>
          <Route
            path="/login"
            element={
              <>
                <div data-testid="login-page">Login</div>
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('renders nested routes when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
            <Route path="/profile" element={<div data-testid="profile">Profile</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Should render dashboard
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('renders different nested routes when navigating', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: mockSession,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
            <Route path="/profile" element={<div data-testid="profile">Profile</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Should render profile
    expect(screen.getByTestId('profile')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });
});
