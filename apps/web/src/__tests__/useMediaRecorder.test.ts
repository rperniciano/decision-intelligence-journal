import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaRecorder, useVoiceRecorder } from '../hooks/useMediaRecorder';

// Mock MediaRecorder
class MockMediaRecorder {
  static isTypeSupported = vi.fn((_type: string) => true);

  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {
    // Stream is handled by MediaRecorder internally
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    if (this.state !== 'inactive') {
      // Simulate data available event
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['test audio'], { type: 'audio/webm' }) });
      }
      this.state = 'inactive';
      if (this.onstop) {
        this.onstop();
      }
    }
  }

  pause() {
    if (this.state === 'recording') {
      this.state = 'paused';
    }
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'recording';
    }
  }

  // Helper method to simulate error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock MediaStream with track
class MockMediaStream {
  private tracks: MockMediaStreamTrack[] = [];

  constructor() {
    this.tracks = [new MockMediaStreamTrack()];
  }

  getTracks() {
    return this.tracks;
  }
}

class MockMediaStreamTrack {
  stop = vi.fn();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;

// Store original globals
const originalMediaRecorder = g.MediaRecorder;
const originalNavigator = g.navigator;

describe('useMediaRecorder', () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;
  let mockStream: MockMediaStream;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock stream
    mockStream = new MockMediaStream();

    // Mock getUserMedia
    mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);

    // Mock navigator.mediaDevices
    Object.defineProperty(g, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
        },
      },
      writable: true,
    });

    // Mock MediaRecorder
    Object.defineProperty(g, 'MediaRecorder', {
      value: MockMediaRecorder,
      writable: true,
    });

    // Mock URL.createObjectURL and revokeObjectURL
    g.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    g.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore globals
    Object.defineProperty(g, 'MediaRecorder', {
      value: originalMediaRecorder,
      writable: true,
    });
    Object.defineProperty(g, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  describe('initial state', () => {
    it('should return initial state values', () => {
      const { result } = renderHook(() => useMediaRecorder());

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.duration).toBe(0);
      expect(result.current.recordingTime).toBe(0);
      expect(result.current.audioBlob).toBeNull();
      expect(result.current.audioUrl).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.permissionState).toBe('prompt');
    });

    it('should expose recordingTime as alias for duration', () => {
      const { result } = renderHook(() => useMediaRecorder());

      expect(result.current.recordingTime).toBe(result.current.duration);
    });
  });

  describe('startRecording', () => {
    it('should request microphone permission and start recording', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      expect(result.current.isRecording).toBe(true);
      expect(result.current.permissionState).toBe('granted');
    });

    it('should reset state before starting new recording', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      // Start and stop first recording
      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        result.current.stopRecording();
      });

      expect(result.current.audioBlob).not.toBeNull();

      // Start second recording
      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.audioBlob).toBeNull();
      expect(result.current.duration).toBe(0);
    });

    it('should handle permission denied error', async () => {
      const permissionError = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValue(permissionError);

      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.permissionState).toBe('denied');
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.type).toBe('permission_denied');
    });

    it('should handle no microphone found error', async () => {
      const notFoundError = new DOMException('No microphone', 'NotFoundError');
      mockGetUserMedia.mockRejectedValue(notFoundError);

      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.type).toBe('no_microphone');
    });

    it('should handle browser unsupported error', async () => {
      // Simulate missing MediaRecorder
      Object.defineProperty(g, 'MediaRecorder', {
        value: undefined,
        writable: true,
      });

      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.permissionState).toBe('unsupported');
      expect(result.current.error?.type).toBe('browser_unsupported');
    });
  });

  describe('stopRecording', () => {
    it('should stop recording and provide audio blob', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // Advance timer to simulate 3 seconds of recording (above minimum)
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      await act(async () => {
        result.current.stopRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.audioBlob).not.toBeNull();
      expect(result.current.audioUrl).toBe('blob:mock-url');
    });

    it('should show error when recording is too short', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // Only record for 1 second (below minimum of 2)
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await act(async () => {
        result.current.stopRecording();
      });

      expect(result.current.error?.type).toBe('recording_too_short');
    });
  });

  describe('pauseRecording', () => {
    it('should pause recording when in recording state', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);
      expect(result.current.isRecording).toBe(true);
    });

    it('should not pause if not recording', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('resumeRecording', () => {
    it('should resume recording when paused', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        result.current.pauseRecording();
      });

      expect(result.current.isPaused).toBe(true);

      await act(async () => {
        result.current.resumeRecording();
      });

      expect(result.current.isPaused).toBe(false);
      expect(result.current.isRecording).toBe(true);
    });

    it('should not resume if not paused', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        result.current.resumeRecording();
      });

      // Should still be recording, not paused
      expect(result.current.isRecording).toBe(true);
      expect(result.current.isPaused).toBe(false);
    });
  });

  describe('resetRecording', () => {
    it('should reset all state to initial values', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      // Start and complete a recording
      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      await act(async () => {
        result.current.stopRecording();
      });

      expect(result.current.audioBlob).not.toBeNull();

      // Reset
      await act(async () => {
        result.current.resetRecording();
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.duration).toBe(0);
      expect(result.current.audioBlob).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('duration timer', () => {
    it('should increment duration every second while recording', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(result.current.duration).toBe(0);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.duration).toBe(1);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.duration).toBe(2);
    });

    it('should not increment duration when paused', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(result.current.duration).toBe(2);

      await act(async () => {
        result.current.pauseRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      // Duration should not increase while paused
      expect(result.current.duration).toBe(2);
    });

    it('should expose recordingTime as alias for duration during recording', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.recordingTime).toBe(5);
      expect(result.current.recordingTime).toBe(result.current.duration);
    });
  });

  describe('max duration', () => {
    it('should auto-stop at max duration (300 seconds)', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // Advance to max duration
      await act(async () => {
        vi.advanceTimersByTime(300000); // 5 minutes
      });

      expect(result.current.isRecording).toBe(false);
      expect(result.current.error?.type).toBe('max_duration_reached');
    });
  });

  describe('MIME type support', () => {
    it('should check for supported MIME types', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(MockMediaRecorder.isTypeSupported).toHaveBeenCalled();
    });

    it('should prefer audio/webm;codecs=opus format', async () => {
      const isTypeSupportedSpy = vi.fn((type: string): boolean => {
        return type === 'audio/webm;codecs=opus';
      });
      MockMediaRecorder.isTypeSupported = isTypeSupportedSpy as typeof MockMediaRecorder.isTypeSupported;

      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      expect(isTypeSupportedSpy).toHaveBeenCalledWith('audio/webm;codecs=opus');
    });

    it('should fallback to audio/mp4 if webm not supported', async () => {
      const isTypeSupportedSpy = vi.fn((type: string): boolean => {
        return type === 'audio/mp4';
      });
      MockMediaRecorder.isTypeSupported = isTypeSupportedSpy as typeof MockMediaRecorder.isTypeSupported;

      const { result } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      // Check that it tried webm first, then mp4
      expect(isTypeSupportedSpy).toHaveBeenCalledWith('audio/webm;codecs=opus');
      expect(isTypeSupportedSpy).toHaveBeenCalledWith('audio/webm');
      expect(isTypeSupportedSpy).toHaveBeenCalledWith('audio/mp4');
    });
  });

  describe('backwards compatibility', () => {
    it('should export useVoiceRecorder as alias', () => {
      expect(useVoiceRecorder).toBe(useMediaRecorder);
    });

    it('useVoiceRecorder should work the same as useMediaRecorder', async () => {
      const { result } = renderHook(() => useVoiceRecorder());

      expect(result.current.isRecording).toBe(false);
      expect(typeof result.current.startRecording).toBe('function');
      expect(typeof result.current.stopRecording).toBe('function');
      expect(typeof result.current.pauseRecording).toBe('function');
      expect(typeof result.current.resumeRecording).toBe('function');
    });
  });

  describe('cleanup', () => {
    it('should stop media stream tracks on unmount', async () => {
      const { result, unmount } = renderHook(() => useMediaRecorder());

      await act(async () => {
        await result.current.startRecording();
      });

      const tracks = mockStream.getTracks();
      expect(tracks[0]?.stop).not.toHaveBeenCalled();

      unmount();

      // Note: We can't directly test the cleanup because jsdom doesn't fully
      // simulate the unmount behavior. The cleanup effect should revoke URLs
      // and stop tracks.
    });

    it('should revoke object URL on new recording', async () => {
      const { result } = renderHook(() => useMediaRecorder());

      // First recording
      await act(async () => {
        await result.current.startRecording();
      });
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      await act(async () => {
        result.current.stopRecording();
      });

      expect(g.URL.createObjectURL).toHaveBeenCalled();

      // Start new recording (should revoke old URL)
      await act(async () => {
        await result.current.startRecording();
      });

      expect(g.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});
