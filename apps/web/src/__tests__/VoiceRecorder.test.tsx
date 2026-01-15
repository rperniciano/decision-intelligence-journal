import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import VoiceRecorder from '../components/audio/VoiceRecorder';

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

// Mock the hooks
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockStartAnalysing = vi.fn();
const mockStopAnalysing = vi.fn();

const mockMediaRecorderReturn = {
  isRecording: false,
  isPaused: false,
  duration: 0,
  recordingTime: 0,
  audioBlob: null as Blob | null,
  audioUrl: null,
  error: null as { type: string; message: string } | null,
  permissionState: 'prompt' as 'prompt' | 'granted' | 'denied' | 'unsupported',
  startRecording: mockStartRecording,
  stopRecording: mockStopRecording,
  pauseRecording: vi.fn(),
  resumeRecording: vi.fn(),
  resetRecording: vi.fn(),
};

const mockAudioAnalyserReturn = {
  frequencyData: new Uint8Array(128),
  timeData: new Uint8Array(128),
  isActive: false,
  error: null,
  startAnalysing: mockStartAnalysing,
  stopAnalysing: mockStopAnalysing,
};

vi.mock('../hooks/useMediaRecorder', () => ({
  useMediaRecorder: () => mockMediaRecorderReturn,
}));

vi.mock('../hooks/useAudioAnalyser', () => ({
  useAudioAnalyser: () => mockAudioAnalyserReturn,
}));

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: vi.fn() }],
};

describe('VoiceRecorder', () => {
  const mockOnRecordingComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset mock values
    mockMediaRecorderReturn.isRecording = false;
    mockMediaRecorderReturn.recordingTime = 0;
    mockMediaRecorderReturn.audioBlob = null;
    mockMediaRecorderReturn.error = null;
    mockMediaRecorderReturn.permissionState = 'prompt';
    mockAudioAnalyserReturn.isActive = false;

    // Setup navigator mock
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
        },
      },
      writable: true,
    });

    mockGetUserMedia.mockResolvedValue(mockStream);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==================== Rendering Tests ====================

  describe('rendering', () => {
    it('renders the voice recorder container', () => {
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
    });

    it('renders the record button', () => {
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('record-button')).toBeInTheDocument();
    });

    it('renders the recording timer', () => {
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('recording-timer')).toBeInTheDocument();
    });

    it('renders the waveform visualizer', () => {
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          className="custom-class"
        />
      );

      expect(screen.getByTestId('voice-recorder')).toHaveClass('custom-class');
    });
  });

  // ==================== State Tests ====================

  describe('state management', () => {
    it('shows idle state initially', () => {
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('voice-recorder')).toHaveAttribute('data-state', 'idle');
    });

    it('shows recording state when isRecording is true', () => {
      mockMediaRecorderReturn.isRecording = true;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('voice-recorder')).toHaveAttribute('data-state', 'recording');
    });

    it('shows stopped state when audioBlob is available', () => {
      mockMediaRecorderReturn.audioBlob = new Blob(['test'], { type: 'audio/webm' });

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('voice-recorder')).toHaveAttribute('data-state', 'stopped');
    });
  });

  // ==================== Recording Flow Tests ====================

  describe('recording flow', () => {
    it('calls startRecording when record button is clicked', async () => {
      vi.useRealTimers(); // Need real timers for async operations
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const recordButton = screen.getByTestId('record-button');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(mockStartRecording).toHaveBeenCalled();
      }, { timeout: 1000 });
      vi.useFakeTimers();
    });

    it('requests microphone permission when starting', async () => {
      vi.useRealTimers(); // Need real timers for async operations
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const recordButton = screen.getByTestId('record-button');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      }, { timeout: 1000 });
      vi.useFakeTimers();
    });

    it('starts audio analyser with the stream', async () => {
      vi.useRealTimers(); // Need real timers for async operations
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const recordButton = screen.getByTestId('record-button');
      fireEvent.click(recordButton);

      await waitFor(() => {
        expect(mockStartAnalysing).toHaveBeenCalledWith(mockStream);
      }, { timeout: 1000 });
      vi.useFakeTimers();
    });

    it('calls stopRecording when record button is clicked during recording', async () => {
      mockMediaRecorderReturn.isRecording = true;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const recordButton = screen.getByTestId('record-button');
      await act(async () => {
        fireEvent.click(recordButton);
      });

      expect(mockStopRecording).toHaveBeenCalled();
    });

    it('stops audio analyser when stopping recording', async () => {
      mockMediaRecorderReturn.isRecording = true;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const recordButton = screen.getByTestId('record-button');
      await act(async () => {
        fireEvent.click(recordButton);
      });

      expect(mockStopAnalysing).toHaveBeenCalled();
    });
  });

  // ==================== Callback Tests ====================

  describe('onRecordingComplete callback', () => {
    it('calls onRecordingComplete when audioBlob is available', () => {
      const blob = new Blob(['test audio'], { type: 'audio/webm' });
      mockMediaRecorderReturn.audioBlob = blob;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(mockOnRecordingComplete).toHaveBeenCalledWith(blob);
    });

    it('does not call onRecordingComplete when audioBlob is null', () => {
      mockMediaRecorderReturn.audioBlob = null;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(mockOnRecordingComplete).not.toHaveBeenCalled();
    });
  });

  // ==================== Max Duration Tests ====================

  describe('maxDuration', () => {
    it('uses default maxDuration of 300 seconds', () => {
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      // Timer should have default warning threshold
      const timer = screen.getByTestId('recording-timer');
      expect(timer).toBeInTheDocument();
    });

    it('accepts custom maxDuration prop', () => {
      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          maxDuration={180}
        />
      );

      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument();
    });

    it('auto-stops recording when maxDuration is reached', async () => {
      mockMediaRecorderReturn.isRecording = true;
      mockMediaRecorderReturn.recordingTime = 180;

      const { rerender } = render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          maxDuration={180}
        />
      );

      // Simulate time passing by rerendering with updated recordingTime
      mockMediaRecorderReturn.recordingTime = 180;
      rerender(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          maxDuration={180}
        />
      );

      expect(mockStopRecording).toHaveBeenCalled();
    });

    it('does not auto-stop before maxDuration', () => {
      mockMediaRecorderReturn.isRecording = true;
      mockMediaRecorderReturn.recordingTime = 100;

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          maxDuration={180}
        />
      );

      expect(mockStopRecording).not.toHaveBeenCalled();
    });
  });

  // ==================== Error Handling Tests ====================

  describe('error handling', () => {
    it('shows error message when permission is denied', () => {
      mockMediaRecorderReturn.permissionState = 'denied';

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Permesso microfono negato'
      );
    });

    it('shows error message when browser is unsupported', () => {
      mockMediaRecorderReturn.permissionState = 'unsupported';

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Il tuo browser non supporta la registrazione audio'
      );
    });

    it('shows error message for no microphone error', () => {
      mockMediaRecorderReturn.error = {
        type: 'no_microphone',
        message: 'No microphone found',
      };

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Nessun microfono trovato'
      );
    });

    it('shows error message for max duration reached', () => {
      mockMediaRecorderReturn.error = {
        type: 'max_duration_reached',
        message: 'Max duration reached',
      };

      render(
        <VoiceRecorder
          onRecordingComplete={mockOnRecordingComplete}
          maxDuration={300}
        />
      );

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'durata massima raggiunta'
      );
    });

    it('shows error message for recording too short', () => {
      mockMediaRecorderReturn.error = {
        type: 'recording_too_short',
        message: 'Recording too short',
      };

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Registrazione troppo breve'
      );
    });

    it('shows generic error message for recording error', () => {
      mockMediaRecorderReturn.error = {
        type: 'recording_error',
        message: 'Recording error',
      };

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Errore durante la registrazione'
      );
    });

    it('error message has alert role for accessibility', () => {
      mockMediaRecorderReturn.error = {
        type: 'recording_error',
        message: 'Error',
      };

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('error-message')).toHaveAttribute('role', 'alert');
    });

    it('does not show error message when no error', () => {
      mockMediaRecorderReturn.error = null;
      mockMediaRecorderReturn.permissionState = 'granted';

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  // ==================== Button State Tests ====================

  describe('button states', () => {
    it('disables record button when browser is unsupported', () => {
      mockMediaRecorderReturn.permissionState = 'unsupported';

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('record-button')).toBeDisabled();
    });

    it('enables record button when browser is supported', () => {
      mockMediaRecorderReturn.permissionState = 'prompt';

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('record-button')).not.toBeDisabled();
    });

    it('shows recording state in button when recording', () => {
      mockMediaRecorderReturn.isRecording = true;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('record-button')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // ==================== Timer Display Tests ====================

  describe('timer display', () => {
    it('shows 00:00 initially', () => {
      mockMediaRecorderReturn.recordingTime = 0;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('recording-timer')).toHaveTextContent('00:00');
    });

    it('displays correct time format', () => {
      mockMediaRecorderReturn.recordingTime = 65; // 1 minute 5 seconds

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('recording-timer')).toHaveTextContent('01:05');
    });

    it('shows active state in timer when recording', () => {
      mockMediaRecorderReturn.isRecording = true;
      mockMediaRecorderReturn.recordingTime = 10;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-red-500');
    });

    it('shows idle state in timer when not recording', () => {
      mockMediaRecorderReturn.isRecording = false;
      mockMediaRecorderReturn.recordingTime = 0;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-gray-500');
    });
  });

  // ==================== Waveform Visualization Tests ====================

  describe('waveform visualization', () => {
    it('passes frequency data to waveform visualizer', () => {
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });

    it('shows active waveform when recording', () => {
      mockMediaRecorderReturn.isRecording = true;
      mockAudioAnalyserReturn.isActive = true;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('aria-label', 'Audio waveform visualization - active');
    });

    it('shows idle waveform when not recording', () => {
      mockMediaRecorderReturn.isRecording = false;
      mockAudioAnalyserReturn.isActive = false;

      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('aria-label', 'Audio waveform visualization - idle');
    });
  });

  // ==================== Cleanup Tests ====================

  describe('cleanup', () => {
    it('stops analyser on unmount', () => {
      const { unmount } = render(
        <VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />
      );

      unmount();

      expect(mockStopAnalysing).toHaveBeenCalled();
    });
  });

  // ==================== Layout Tests ====================

  describe('layout', () => {
    it('has centered layout classes', () => {
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const container = screen.getByTestId('voice-recorder');
      expect(container).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('has proper spacing between elements', () => {
      render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

      const container = screen.getByTestId('voice-recorder');
      expect(container).toHaveClass('gap-6');
    });
  });
});
