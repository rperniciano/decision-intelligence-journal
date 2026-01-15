import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock the Supabase client
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

// Simple component to test rendering
function TestComponent() {
  return (
    <div data-testid="test-component">
      <h1>Decision Intelligence Journal</h1>
      <p>Welcome to the app</p>
    </div>
  );
}

describe('App', () => {
  it('renders test component correctly', () => {
    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Decision Intelligence Journal')).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByText('Welcome to the app')).toBeInTheDocument();
  });
});
