import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioAnalyser } from '../hooks/useAudioAnalyser';

// Mock Web Audio API
const mockGetByteFrequencyData = vi.fn((array: Uint8Array) => {
  // Simulate frequency data (bass heavy)
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.max(0, 200 - i * 2);
  }
});

const mockGetByteTimeDomainData = vi.fn((array: Uint8Array) => {
  // Simulate waveform centered at 128
  for (let i = 0; i < array.length; i++) {
    array[i] = 128 + Math.floor(50 * Math.sin(i * 0.1));
  }
});

// Track created instances
let audioContextInstances: MockAudioContextClass[] = [];
let analyserInstances: MockAnalyserNodeClass[] = [];
let sourceInstances: MockMediaStreamAudioSourceNodeClass[] = [];

class MockAnalyserNodeClass {
  fftSize = 2048;
  frequencyBinCount = 1024;
  minDecibels = -100;
  maxDecibels = -30;
  smoothingTimeConstant = 0.8;
  getByteFrequencyData = mockGetByteFrequencyData;
  getByteTimeDomainData = mockGetByteTimeDomainData;
  connect = vi.fn();
  disconnect = vi.fn();

  constructor() {
    analyserInstances.push(this);
  }
}

class MockMediaStreamAudioSourceNodeClass {
  connect = vi.fn();
  disconnect = vi.fn();

  constructor() {
    sourceInstances.push(this);
  }
}

class MockAudioContextClass {
  state = 'running';
  _analyser: MockAnalyserNodeClass | null = null;
  _source: MockMediaStreamAudioSourceNodeClass | null = null;
  createAnalyserFn = vi.fn();
  createMediaStreamSourceFn = vi.fn();
  close = vi.fn().mockResolvedValue(undefined);

  constructor() {
    audioContextInstances.push(this);
  }

  createAnalyser() {
    this.createAnalyserFn();
    this._analyser = new MockAnalyserNodeClass();
    return this._analyser;
  }

  createMediaStreamSource(stream: MediaStream) {
    this.createMediaStreamSourceFn(stream);
    this._source = new MockMediaStreamAudioSourceNodeClass();
    return this._source;
  }
}

// Store the original values
let originalAudioContext: typeof AudioContext | undefined;
let originalRequestAnimationFrame: typeof requestAnimationFrame;
let originalCancelAnimationFrame: typeof cancelAnimationFrame;

describe('useAudioAnalyser', () => {
  let animationFrameCallbacks: ((time: number) => void)[] = [];
  let animationFrameId = 0;

  beforeEach(() => {
    // Store originals
    originalAudioContext = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

    // Clear callbacks and instances
    animationFrameCallbacks = [];
    animationFrameId = 0;
    audioContextInstances = [];
    analyserInstances = [];
    sourceInstances = [];

    // Mock AudioContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).AudioContext = MockAudioContextClass;

    // Mock requestAnimationFrame
    globalThis.requestAnimationFrame = vi.fn((callback: (time: number) => void) => {
      animationFrameCallbacks.push(callback);
      return ++animationFrameId;
    });

    // Mock cancelAnimationFrame
    globalThis.cancelAnimationFrame = vi.fn();

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore originals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = globalThis as any;
    if (originalAudioContext !== undefined) {
      g.AudioContext = originalAudioContext;
    } else {
      delete g.AudioContext;
    }
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  // Helper to create mock MediaStream
  const createMockMediaStream = (): MediaStream => {
    return {
      getTracks: vi.fn(() => []),
      getAudioTracks: vi.fn(() => []),
      getVideoTracks: vi.fn(() => []),
      addTrack: vi.fn(),
      removeTrack: vi.fn(),
      clone: vi.fn(),
      id: 'mock-stream-id',
      active: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaStream;
  };

  // Helper to run animation frames
  const runAnimationFrame = () => {
    const callbacks = [...animationFrameCallbacks];
    animationFrameCallbacks = [];
    callbacks.forEach((cb) => cb(performance.now()));
  };

  describe('initial state', () => {
    it('should have empty frequency data array', () => {
      const { result } = renderHook(() => useAudioAnalyser());

      expect(result.current.frequencyData).toBeInstanceOf(Uint8Array);
      expect(result.current.frequencyData.length).toBe(128); // default fftSize 256 / 2
    });

    it('should have empty time data array', () => {
      const { result } = renderHook(() => useAudioAnalyser());

      expect(result.current.timeData).toBeInstanceOf(Uint8Array);
      expect(result.current.timeData.length).toBe(128);
    });

    it('should not be active initially', () => {
      const { result } = renderHook(() => useAudioAnalyser());

      expect(result.current.isActive).toBe(false);
    });

    it('should have no error initially', () => {
      const { result } = renderHook(() => useAudioAnalyser());

      expect(result.current.error).toBe(null);
    });

    it('should respect custom fftSize option', () => {
      const { result } = renderHook(() => useAudioAnalyser({ fftSize: 512 }));

      expect(result.current.frequencyData.length).toBe(256); // 512 / 2
      expect(result.current.timeData.length).toBe(256);
    });
  });

  describe('startAnalysing', () => {
    it('should start analysing and set isActive to true', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it('should create AudioContext', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(audioContextInstances.length).toBe(1);
    });

    it('should create AnalyserNode with correct options', () => {
      const options = {
        fftSize: 512,
        minDecibels: -80,
        maxDecibels: -20,
        smoothingTimeConstant: 0.5,
      };
      const { result } = renderHook(() => useAudioAnalyser(options));
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(audioContextInstances[0]!.createAnalyserFn).toHaveBeenCalled();
      expect(analyserInstances.length).toBe(1);
    });

    it('should create MediaStreamSource from stream', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(audioContextInstances[0]!.createMediaStreamSourceFn).toHaveBeenCalledWith(stream);
      expect(sourceInstances.length).toBe(1);
    });

    it('should connect source to analyser', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(sourceInstances[0]!.connect).toHaveBeenCalled();
    });

    it('should start animation frame loop', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should update frequency and time data on animation frame', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      // Run the animation frame
      act(() => {
        runAnimationFrame();
      });

      // Data should be updated with mock values
      expect(mockGetByteFrequencyData).toHaveBeenCalled();
      expect(mockGetByteTimeDomainData).toHaveBeenCalled();
    });

    it('should close previous AudioContext when starting new analysis', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream1 = createMockMediaStream();
      const stream2 = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream1);
      });

      const firstAudioContext = audioContextInstances[0]!;

      act(() => {
        result.current.startAnalysing(stream2);
      });

      expect(firstAudioContext.close).toHaveBeenCalled();
    });

    it('should set error when AudioContext is not supported', () => {
      // Remove AudioContext temporarily
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).AudioContext;

      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(result.current.error).toBe('Web Audio API non supportato dal browser');
      expect(result.current.isActive).toBe(false);
    });

    it('should handle errors during initialization', () => {
      // Create a special mock class that throws
      class ThrowingAudioContext {
        state = 'running';
        createAnalyser = vi.fn(() => new MockAnalyserNodeClass());
        createMediaStreamSource = vi.fn(() => {
          throw new Error('Failed to create source');
        });
        close = vi.fn().mockResolvedValue(undefined);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).AudioContext = ThrowingAudioContext;

      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(result.current.error).toBe('Failed to create source');
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('stopAnalysing', () => {
    it('should stop analysing and set isActive to false', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(result.current.isActive).toBe(true);

      act(() => {
        result.current.stopAnalysing();
      });

      expect(result.current.isActive).toBe(false);
    });

    it('should cancel animation frame', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      act(() => {
        result.current.stopAnalysing();
      });

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should disconnect source', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      const source = sourceInstances[0]!;

      act(() => {
        result.current.stopAnalysing();
      });

      expect(source.disconnect).toHaveBeenCalled();
    });

    it('should close AudioContext', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      const audioContext = audioContextInstances[0]!;

      act(() => {
        result.current.stopAnalysing();
      });

      expect(audioContext.close).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      const { result } = renderHook(() => useAudioAnalyser());

      // Call stop without ever starting - should not throw
      expect(() => {
        act(() => {
          result.current.stopAnalysing();
        });
      }).not.toThrow();

      // Call stop again
      expect(() => {
        act(() => {
          result.current.stopAnalysing();
        });
      }).not.toThrow();
    });
  });

  describe('cleanup on unmount', () => {
    it('should cleanup resources on unmount', () => {
      const { result, unmount } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      const audioContext = audioContextInstances[0]!;
      const source = sourceInstances[0]!;

      unmount();

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
      expect(source.disconnect).toHaveBeenCalled();
      expect(audioContext.close).toHaveBeenCalled();
    });

    it('should not throw if unmounted before starting', () => {
      const { unmount } = renderHook(() => useAudioAnalyser());

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('continuous updates', () => {
    it('should continue requesting animation frames while active', () => {
      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      // First frame
      act(() => {
        runAnimationFrame();
      });

      // Should have requested another frame
      expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(2);

      // Second frame
      act(() => {
        runAnimationFrame();
      });

      expect(globalThis.requestAnimationFrame).toHaveBeenCalledTimes(3);
    });
  });

  describe('data array sizes', () => {
    it('should resize data arrays based on fftSize', () => {
      const { result } = renderHook(() => useAudioAnalyser({ fftSize: 1024 }));
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      // After starting, arrays should be resized to frequencyBinCount
      // Our mock returns 1024 for frequencyBinCount
      expect(result.current.frequencyData.length).toBeGreaterThan(0);
      expect(result.current.timeData.length).toBeGreaterThan(0);
    });
  });

  describe('default options', () => {
    it('should use default fftSize of 256', () => {
      const { result } = renderHook(() => useAudioAnalyser());

      // Default fftSize is 256, so frequencyBinCount is 128
      expect(result.current.frequencyData.length).toBe(128);
    });

    it('should use custom options when provided', () => {
      const { result } = renderHook(() =>
        useAudioAnalyser({
          fftSize: 2048,
          minDecibels: -60,
          maxDecibels: -5,
          smoothingTimeConstant: 0.9,
        })
      );

      // Initial array size based on fftSize
      expect(result.current.frequencyData.length).toBe(1024); // 2048 / 2
    });
  });

  describe('webkitAudioContext fallback', () => {
    it('should use webkitAudioContext when AudioContext is not available', () => {
      // Remove AudioContext but add webkitAudioContext
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = globalThis as any;
      delete g.AudioContext;
      g.webkitAudioContext = MockAudioContextClass;

      const { result } = renderHook(() => useAudioAnalyser());
      const stream = createMockMediaStream();

      act(() => {
        result.current.startAnalysing(stream);
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.error).toBe(null);

      // Restore
      delete g.webkitAudioContext;
    });
  });
});
