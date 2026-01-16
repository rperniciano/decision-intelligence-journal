import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import Layout from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

// Mock useAuth hook
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Helper component to capture navigation
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

const mockUseAuth = useAuth as Mock;

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    display_name: 'Test User',
    avatar_url: null,
  },
};

const mockUserWithAvatar = {
  ...mockUser,
  user_metadata: {
    display_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
};

const mockSignOut = vi.fn();

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signOut: mockSignOut,
    });
  });

  describe('Rendering', () => {
    it('renders header with app logo and name', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Test content</div>
          </Layout>
        </BrowserRouter>
      );

      // App name shown on desktop
      expect(screen.getByText('Decision Journal')).toBeInTheDocument();
      // Logo (lightbulb icon) exists in header
      const header = screen.getByRole('banner');
      expect(header).toBeInTheDocument();
    });

    it('renders children in main content area', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div data-testid="child-content">Test child content</div>
          </Layout>
        </BrowserRouter>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test child content')).toBeInTheDocument();
    });

    it('renders user display name from metadata', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('renders user initials when no avatar', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // "Test User" -> "TU" initials
      expect(screen.getByText('TU')).toBeInTheDocument();
    });

    it('renders user avatar image when available', () => {
      mockUseAuth.mockReturnValue({
        user: mockUserWithAvatar,
        loading: false,
        signOut: mockSignOut,
      });

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const avatar = screen.getByAltText('Test User');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('falls back to email username when no display name', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: 'john@example.com',
          user_metadata: {},
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      expect(screen.getByText('john')).toBeInTheDocument();
    });

    it('uses "User" as default when no email or display name', () => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 'user-123',
          email: null,
          user_metadata: {},
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  describe('Desktop Dropdown Menu', () => {
    it('shows dropdown menu when clicking user button', async () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Desktop menu button (contains user name)
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      // Menu items should appear
      expect(screen.getByRole('menuitem', { name: /profilo/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /impostazioni/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /esci/i })).toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      render(
        <BrowserRouter>
          <Layout>
            <div data-testid="outside">Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Open menu
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);
      expect(screen.getByRole('menuitem', { name: /profilo/i })).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'));

      // Menu should close
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /profilo/i })).not.toBeInTheDocument();
      });
    });

    it('toggles dropdown menu on button click', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const menuButton = screen.getByRole('button', { name: /menu utente/i });

      // Open
      fireEvent.click(menuButton);
      expect(screen.getByRole('menuitem', { name: /profilo/i })).toBeInTheDocument();

      // Close
      fireEvent.click(menuButton);
      expect(screen.queryByRole('menuitem', { name: /profilo/i })).not.toBeInTheDocument();
    });

    it('closes dropdown when clicking Profile link', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      const profileLink = screen.getByRole('menuitem', { name: /profilo/i });
      fireEvent.click(profileLink);

      expect(screen.queryByRole('menuitem', { name: /impostazioni/i })).not.toBeInTheDocument();
    });
  });

  describe('Mobile Menu', () => {
    it('shows hamburger menu button on mobile', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // The mobile hamburger button
      const mobileMenuButton = screen.getByRole('button', { name: /apri menu/i });
      expect(mobileMenuButton).toBeInTheDocument();
    });

    it('opens mobile menu when clicking hamburger', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const mobileMenuButton = screen.getByRole('button', { name: /apri menu/i });
      fireEvent.click(mobileMenuButton);

      // Mobile menu content should appear
      expect(screen.getByText(mockUser.email!)).toBeInTheDocument();
    });

    it('shows close button when mobile menu is open', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const mobileMenuButton = screen.getByRole('button', { name: /apri menu/i });
      fireEvent.click(mobileMenuButton);

      // Close button should appear
      const closeButton = screen.getByRole('button', { name: /chiudi menu/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('closes mobile menu when clicking close button', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Open
      const mobileMenuButton = screen.getByRole('button', { name: /apri menu/i });
      fireEvent.click(mobileMenuButton);
      // Mobile menu is open, navigation should exist
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Close
      const closeButton = screen.getByRole('button', { name: /chiudi menu/i });
      fireEvent.click(closeButton);

      // Mobile menu should be closed, navigation should be gone
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      // The "Apri menu" button should be back
      expect(screen.getByRole('button', { name: /apri menu/i })).toBeInTheDocument();
    });

    it('renders mobile menu items: Profilo, Impostazioni, Esci', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const mobileMenuButton = screen.getByRole('button', { name: /apri menu/i });
      fireEvent.click(mobileMenuButton);

      // Mobile menu items
      const mobileNav = screen.getByRole('navigation');
      expect(mobileNav).toBeInTheDocument();
      expect(mobileNav.textContent).toContain('Profilo');
      expect(mobileNav.textContent).toContain('Impostazioni');
      expect(mobileNav.textContent).toContain('Esci');
    });
  });

  describe('Logout Functionality', () => {
    it('calls signOut when clicking logout in desktop menu', async () => {
      mockSignOut.mockResolvedValue(undefined);

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Open desktop menu
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      // Click logout
      const logoutButton = screen.getByRole('menuitem', { name: /esci/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it('calls signOut when clicking logout in mobile menu', async () => {
      mockSignOut.mockResolvedValue(undefined);

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Open mobile menu
      const mobileMenuButton = screen.getByRole('button', { name: /apri menu/i });
      fireEvent.click(mobileMenuButton);

      // Click logout in mobile nav
      const mobileNav = screen.getByRole('navigation');
      const logoutButton = mobileNav.querySelector('button');
      fireEvent.click(logoutButton!);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it('initiates logout and calls signOut', async () => {
      // Make signOut resolve immediately
      mockSignOut.mockResolvedValue(undefined);

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Open desktop menu and click logout
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      const logoutButton = screen.getByRole('menuitem', { name: /esci/i });
      fireEvent.click(logoutButton);

      // signOut should be called (menus close immediately, so no spinner visible)
      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });
    });

    it('closes menus and triggers signOut when clicking logout', async () => {
      mockSignOut.mockImplementation(() => new Promise(() => {}));

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Open desktop menu
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      // Verify dropdown is open
      expect(screen.getByRole('menuitem', { name: /esci/i })).toBeInTheDocument();

      // Click logout
      const logoutButton = screen.getByRole('menuitem', { name: /esci/i });
      fireEvent.click(logoutButton);

      // Menus are closed immediately on logout start
      await waitFor(() => {
        // Dropdown menu should be closed
        expect(screen.queryByRole('menuitem', { name: /esci/i })).not.toBeInTheDocument();
      });

      // signOut should have been called
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('shows error message when logout fails', async () => {
      mockSignOut.mockRejectedValue(new Error('Logout failed'));

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Open desktop menu and click logout
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      const logoutButton = screen.getByRole('menuitem', { name: /esci/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText('Logout failed')).toBeInTheDocument();
      });
    });

    it('shows default error message when logout error has no message', async () => {
      mockSignOut.mockRejectedValue({});

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Open desktop menu and click logout
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      const logoutButton = screen.getByRole('menuitem', { name: /esci/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText('Errore durante il logout. Riprova.')).toBeInTheDocument();
      });
    });

    it('allows dismissing error message', async () => {
      mockSignOut.mockRejectedValue(new Error('Test error'));

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Trigger error
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);
      const logoutButton = screen.getByRole('menuitem', { name: /esci/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Dismiss error
      const dismissButton = screen.getByRole('button', { name: /chiudi/i });
      fireEvent.click(dismissButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('links logo to dashboard', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const logoLink = screen.getByRole('link', { name: /decision journal/i });
      expect(logoLink).toHaveAttribute('href', '/dashboard');
    });

    it('profile link navigates to /profile', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Layout>
            <div>Content</div>
          </Layout>
          <LocationDisplay />
        </MemoryRouter>
      );

      // Open menu
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      // Click profile link
      const profileLink = screen.getByRole('menuitem', { name: /profilo/i });
      fireEvent.click(profileLink);

      expect(screen.getByTestId('location-display')).toHaveTextContent('/profile');
    });

    it('settings link navigates to /settings', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Layout>
            <div>Content</div>
          </Layout>
          <LocationDisplay />
        </MemoryRouter>
      );

      // Open menu
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      // Click settings link
      const settingsLink = screen.getByRole('menuitem', { name: /impostazioni/i });
      fireEvent.click(settingsLink);

      expect(screen.getByTestId('location-display')).toHaveTextContent('/settings');
    });
  });

  describe('Accessibility', () => {
    it('has correct aria attributes on desktop menu button', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      expect(menuButton).toHaveAttribute('aria-expanded', 'false');
      expect(menuButton).toHaveAttribute('aria-haspopup', 'true');
    });

    it('updates aria-expanded when menu opens', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);

      expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('has correct aria attributes on mobile menu button', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const mobileMenuButton = screen.getByRole('button', { name: /apri menu/i });
      expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('error alert has correct role and aria-live', async () => {
      mockSignOut.mockRejectedValue(new Error('Test error'));

      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      // Trigger error
      const menuButton = screen.getByRole('button', { name: /menu utente/i });
      fireEvent.click(menuButton);
      const logoutButton = screen.getByRole('menuitem', { name: /esci/i });
      fireEvent.click(logoutButton);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Sticky Header', () => {
    it('header has sticky positioning class', () => {
      render(
        <BrowserRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </BrowserRouter>
      );

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('sticky', 'top-0', 'z-50');
    });
  });
});
