import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecordDecisionPage from '../pages/RecordDecisionPage';

// Mock the auth context
const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer' as const,
  user: {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    session: mockSession,
    user: mockSession.user,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
  })),
}));

// Mock the useUploadAudio hook
const mockUpload = vi.fn();
const mockReset = vi.fn();
vi.mock('../hooks/useUploadAudio', () => ({
  useUploadAudio: vi.fn(() => ({
    state: 'idle',
    isUploading: false,
    result: null,
    error: null,
    progress: null,
    upload: mockUpload,
    reset: mockReset,
  })),
}));

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

// Mock canvas context
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  fill: vi.fn(),
  roundRect: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  scale: vi.fn(),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  return setTimeout(() => cb(Date.now()), 0);
});
vi.stubGlobal('cancelAnimationFrame', (id: number) => {
  clearTimeout(id);
});

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
vi.stubGlobal('URL', {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL,
});

// Mock VoiceRecorder component to simplify testing
vi.mock('../components/audio', () => ({
  VoiceRecorder: ({
    onRecordingComplete,
    className,
  }: {
    onRecordingComplete: (blob: Blob) => void;
    maxDuration?: number;
    className?: string;
  }) => (
    <div data-testid="voice-recorder" className={className}>
      <button
        type="button"
        data-testid="mock-record-button"
        onClick={() => {
          // Simulate recording complete
          const mockBlob = new Blob(['test audio'], { type: 'audio/webm' });
          onRecordingComplete(mockBlob);
        }}
      >
        Registra
      </button>
    </div>
  ),
}));

describe('RecordDecisionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpload.mockResolvedValue({
      url: 'https://storage.example.com/audio/123.webm',
      path: 'user-id/123.webm',
      size: 12345,
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to render the page with router context
   */
  const renderPage = () => {
    return render(
      <MemoryRouter>
        <RecordDecisionPage />
      </MemoryRouter>
    );
  };

  describe('Rendering', () => {
    it('should render the page container', () => {
      renderPage();
      expect(screen.getByTestId('record-decision-page')).toBeInTheDocument();
    });

    it('should render the title "Parla della tua decisione"', () => {
      renderPage();
      expect(screen.getByText('Parla della tua decisione')).toBeInTheDocument();
    });

    it('should render the subtitle hint text', () => {
      renderPage();
      expect(
        screen.getByText(/Descrivi la situazione, le opzioni che stai considerando/)
      ).toBeInTheDocument();
    });

    it('should render the VoiceRecorder component in idle state', () => {
      renderPage();
      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
    });

    it('should render the footer with max duration tip', () => {
      renderPage();
      expect(screen.getByText('Durata massima: 5 minuti')).toBeInTheDocument();
    });

    it('should have idle state by default', () => {
      renderPage();
      expect(screen.getByTestId('record-decision-page')).toHaveAttribute(
        'data-state',
        'idle'
      );
    });
  });

  describe('Page structure', () => {
    it('should have full-screen height', () => {
      renderPage();
      const page = screen.getByTestId('record-decision-page');
      expect(page).toHaveClass('min-h-screen');
    });

    it('should have white background', () => {
      renderPage();
      const page = screen.getByTestId('record-decision-page');
      expect(page).toHaveClass('bg-white');
    });

    it('should have flex column layout', () => {
      renderPage();
      const page = screen.getByTestId('record-decision-page');
      expect(page).toHaveClass('flex', 'flex-col');
    });

    it('should center content in main area', () => {
      renderPage();
      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex-1', 'flex', 'flex-col', 'items-center', 'justify-center');
    });
  });

  describe('Recording flow', () => {
    it('should transition to preview state when recording completes', async () => {
      renderPage();

      // Click mock record button to simulate recording complete
      const recordButton = screen.getByTestId('mock-record-button');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(screen.getByTestId('record-decision-page')).toHaveAttribute(
          'data-state',
          'preview'
        );
      });
    });

    it('should show preview section after recording', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));

      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });
    });

    it('should hide VoiceRecorder in preview state', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('voice-recorder')).not.toBeInTheDocument();
      });
    });

    it('should create object URL for audio blob', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('Preview state UI', () => {
    const goToPreviewState = async () => {
      renderPage();
      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });
    };

    it('should show "Registrazione completata" message', async () => {
      await goToPreviewState();
      expect(screen.getByText('Registrazione completata')).toBeInTheDocument();
    });

    it('should show "Riascolta" button', async () => {
      await goToPreviewState();
      expect(screen.getByTestId('replay-button')).toBeInTheDocument();
      expect(screen.getByText('Riascolta')).toBeInTheDocument();
    });

    it('should show "Riprova" button', async () => {
      await goToPreviewState();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      expect(screen.getByText('Riprova')).toBeInTheDocument();
    });

    it('should show "Continua" button', async () => {
      await goToPreviewState();
      expect(screen.getByTestId('continue-button')).toBeInTheDocument();
      expect(screen.getByText('Continua')).toBeInTheDocument();
    });

    it('should render hidden audio element for playback', async () => {
      await goToPreviewState();
      const audioPlayer = screen.getByTestId('audio-player');
      expect(audioPlayer).toBeInTheDocument();
      expect(audioPlayer).toHaveClass('hidden');
    });

    it('should update footer text in preview state', async () => {
      await goToPreviewState();
      expect(
        screen.getByText('Premi Continua per procedere con la trascrizione')
      ).toBeInTheDocument();
    });

    it('should show success check icon', async () => {
      await goToPreviewState();
      const successIcon = screen.getByRole('main').querySelector('.bg-green-100');
      expect(successIcon).toBeInTheDocument();
    });
  });

  describe('Preview actions', () => {
    const goToPreviewState = async () => {
      renderPage();
      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });
    };

    it('should have proper aria-labels on buttons', async () => {
      await goToPreviewState();

      expect(screen.getByLabelText('Riascolta registrazione')).toBeInTheDocument();
      expect(screen.getByLabelText('Riprova registrazione')).toBeInTheDocument();
      expect(screen.getByLabelText('Continua al prossimo passo')).toBeInTheDocument();
    });

    it('should have accessible region label', async () => {
      await goToPreviewState();
      expect(screen.getByRole('region', { name: 'Anteprima registrazione' })).toBeInTheDocument();
    });
  });

  describe('Retry functionality', () => {
    it('should return to idle state when retry is clicked', async () => {
      renderPage();

      // Go to preview state
      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      // Click retry
      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('record-decision-page')).toHaveAttribute(
          'data-state',
          'idle'
        );
      });
    });

    it('should show VoiceRecorder again after retry', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
      });
    });

    it('should revoke old audio URL on retry', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      });
    });

    it('should reset upload state on retry', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
      });
    });
  });

  describe('Continue functionality', () => {
    it('should call upload function when clicked', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('continue-button'));

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith(expect.any(Blob));
      });
    });
  });

  describe('Replay functionality', () => {
    it('should have play icon by default', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      const replayButton = screen.getByTestId('replay-button');
      const svg = replayButton.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should show "Riascolta" label', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      expect(screen.getByText('Riascolta')).toBeInTheDocument();
    });
  });

  describe('Button styling', () => {
    const goToPreviewState = async () => {
      renderPage();
      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });
    };

    it('should have gray background for Riascolta button', async () => {
      await goToPreviewState();
      const button = screen.getByTestId('replay-button');
      expect(button).toHaveClass('bg-gray-100');
    });

    it('should have gray background for Riprova button', async () => {
      await goToPreviewState();
      const button = screen.getByTestId('retry-button');
      expect(button).toHaveClass('bg-gray-100');
    });

    it('should have blue background for Continua button', async () => {
      await goToPreviewState();
      const button = screen.getByTestId('continue-button');
      expect(button).toHaveClass('bg-blue-600');
    });

    it('should have minimum touch target size on buttons', async () => {
      await goToPreviewState();
      const buttons = [
        screen.getByTestId('replay-button'),
        screen.getByTestId('retry-button'),
        screen.getByTestId('continue-button'),
      ];
      buttons.forEach((button) => {
        expect(button).toHaveClass('min-h-[48px]');
      });
    });
  });

  describe('Cleanup', () => {
    it('should revoke URL on unmount', async () => {
      const { unmount } = renderPage();

      // Go to preview state to create URL
      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      // Clear mocks to ensure cleanup call is counted
      mockRevokeObjectURL.mockClear();

      // Unmount
      unmount();

      // URL should be revoked on unmount
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('Accessibility', () => {
    it('should have main landmark', () => {
      renderPage();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have heading level 1 for title', () => {
      renderPage();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Parla della tua decisione'
      );
    });

    it('should have heading level 2 in preview state', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'Registrazione completata'
      );
    });

    it('should have type="button" on all buttons', async () => {
      renderPage();

      fireEvent.click(screen.getByTestId('mock-record-button'));
      await waitFor(() => {
        expect(screen.getByTestId('preview-section')).toBeInTheDocument();
      });

      const buttons = [
        screen.getByTestId('replay-button'),
        screen.getByTestId('retry-button'),
        screen.getByTestId('continue-button'),
      ];

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });
});
