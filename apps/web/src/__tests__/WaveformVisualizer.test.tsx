import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WaveformVisualizer from '../components/audio/WaveformVisualizer';

// Store original values
let originalRequestAnimationFrame: typeof requestAnimationFrame;
let originalCancelAnimationFrame: typeof cancelAnimationFrame;
let originalResizeObserver: typeof ResizeObserver;

// Mock CanvasRenderingContext2D
const mockClearRect = vi.fn();
const mockBeginPath = vi.fn();
const mockRoundRect = vi.fn();
const mockFill = vi.fn();
const mockScale = vi.fn();
const mockCreateLinearGradient = vi.fn(() => ({
  addColorStop: vi.fn(),
}));

// Track canvas operations
let canvasContext: ReturnType<typeof createMockContext>;

function createMockContext() {
  return {
    clearRect: mockClearRect,
    beginPath: mockBeginPath,
    roundRect: mockRoundRect,
    fill: mockFill,
    scale: mockScale,
    createLinearGradient: mockCreateLinearGradient,
    fillStyle: '',
  };
}

// Mock canvas element
HTMLCanvasElement.prototype.getContext = vi.fn(function (
  this: HTMLCanvasElement,
  contextId: string
) {
  if (contextId === '2d') {
    canvasContext = createMockContext();
    return canvasContext;
  }
  return null;
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Track ResizeObserver instances
let resizeObserverInstances: MockResizeObserverClass[] = [];

// Mock ResizeObserver
class MockResizeObserverClass {
  callback: ResizeObserverCallback;
  observeFn = vi.fn();
  unobserveFn = vi.fn();
  disconnectFn = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    resizeObserverInstances.push(this);
  }

  observe = (target: Element) => {
    this.observeFn(target);
  };

  unobserve = (target: Element) => {
    this.unobserveFn(target);
  };

  disconnect = () => {
    this.disconnectFn();
  };
}

describe('WaveformVisualizer', () => {
  let animationFrameCallbacks: ((time: number) => void)[] = [];
  let animationFrameId = 0;

  beforeEach(() => {
    // Store originals
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
    originalResizeObserver = globalThis.ResizeObserver;

    // Clear callbacks and instances
    animationFrameCallbacks = [];
    animationFrameId = 0;
    resizeObserverInstances = [];

    // Mock requestAnimationFrame
    globalThis.requestAnimationFrame = vi.fn((callback: (time: number) => void) => {
      animationFrameCallbacks.push(callback);
      return ++animationFrameId;
    });

    // Mock cancelAnimationFrame
    globalThis.cancelAnimationFrame = vi.fn();

    // Mock ResizeObserver
    globalThis.ResizeObserver = MockResizeObserverClass as unknown as typeof ResizeObserver;

    // Mock devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      writable: true,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore originals
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.ResizeObserver = originalResizeObserver;
  });

  // Helper to create frequency data
  const createFrequencyData = (values: number[] = []): Uint8Array => {
    const data = new Uint8Array(128);
    values.forEach((v, i) => {
      if (i < data.length) {
        data[i] = v;
      }
    });
    return data;
  };

  // Helper to run animation frames
  const runAnimationFrame = () => {
    const callbacks = [...animationFrameCallbacks];
    animationFrameCallbacks = [];
    callbacks.forEach((cb) => cb(performance.now()));
  };

  describe('rendering', () => {
    it('should render the container with data-testid', () => {
      const data = createFrequencyData();
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });

    it('should render a canvas element', () => {
      const data = createFrequencyData();
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      expect(screen.getByTestId('waveform-canvas')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const data = createFrequencyData();
      render(<WaveformVisualizer frequencyData={data} isActive={false} className="h-20 bg-gray-100" />);

      const container = screen.getByTestId('waveform-visualizer');
      expect(container).toHaveClass('h-20', 'bg-gray-100');
    });

    it('should have aria-label for accessibility when inactive', () => {
      const data = createFrequencyData();
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('aria-label', 'Audio waveform visualization - idle');
    });

    it('should have aria-label for accessibility when active', () => {
      const data = createFrequencyData();
      render(<WaveformVisualizer frequencyData={data} isActive={true} />);

      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('aria-label', 'Audio waveform visualization - active');
    });

    it('should have role="img" for accessibility', () => {
      const data = createFrequencyData();
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      const canvas = screen.getByTestId('waveform-canvas');
      expect(canvas).toHaveAttribute('role', 'img');
    });
  });

  describe('canvas drawing', () => {
    it('should get 2d context from canvas', () => {
      const data = createFrequencyData();
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d');
    });

    it('should clear canvas before drawing', () => {
      const data = createFrequencyData([100, 150, 200]);
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      expect(mockClearRect).toHaveBeenCalled();
    });

    it('should create gradient for bar coloring', () => {
      const data = createFrequencyData([100, 150, 200]);
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      expect(mockCreateLinearGradient).toHaveBeenCalled();
    });

    it('should draw bars using beginPath and fill', () => {
      const data = createFrequencyData([100, 150, 200]);
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      expect(mockBeginPath).toHaveBeenCalled();
      expect(mockFill).toHaveBeenCalled();
    });

    it('should draw bars with roundRect for rounded corners', () => {
      const data = createFrequencyData([100, 150, 200]);
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      expect(mockRoundRect).toHaveBeenCalled();
    });
  });

  describe('animation', () => {
    it('should not start animation loop when inactive', () => {
      const data = createFrequencyData();
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      // Run any queued frames
      runAnimationFrame();

      // Should not have added more animation frames (animation loop should stop when inactive)
      expect(animationFrameCallbacks.length).toBe(0);
    });

    it('should start animation loop when active', () => {
      const data = createFrequencyData([100, 150, 200]);
      render(<WaveformVisualizer frequencyData={data} isActive={true} />);

      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should continue animation loop while active', () => {
      const data = createFrequencyData([100, 150, 200]);
      render(<WaveformVisualizer frequencyData={data} isActive={true} />);

      // Run first frame
      runAnimationFrame();

      // Should have requested another frame
      expect(animationFrameCallbacks.length).toBeGreaterThan(0);
    });

    it('should cancel animation frame on unmount', () => {
      const data = createFrequencyData([100, 150, 200]);
      const { unmount } = render(<WaveformVisualizer frequencyData={data} isActive={true} />);

      unmount();

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('idle state', () => {
    it('should draw bars at minimum height when inactive', () => {
      const data = createFrequencyData([0, 0, 0]); // All zeros
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      // Bars should still be drawn (beginPath and fill called)
      expect(mockBeginPath).toHaveBeenCalled();
      expect(mockFill).toHaveBeenCalled();
    });

    it('should respect custom minBarHeight', () => {
      const data = createFrequencyData([0, 0, 0]);
      render(<WaveformVisualizer frequencyData={data} isActive={false} minBarHeight={5} />);

      // Component renders, bars are drawn
      expect(mockRoundRect).toHaveBeenCalled();
    });
  });

  describe('responsive behavior', () => {
    it('should observe parent resize with ResizeObserver', () => {
      const data = createFrequencyData();
      render(
        <div style={{ width: '200px', height: '100px' }}>
          <WaveformVisualizer frequencyData={data} isActive={false} />
        </div>
      );

      // Check that at least one ResizeObserver was created and observe was called
      expect(resizeObserverInstances.length).toBeGreaterThan(0);
      expect(resizeObserverInstances[0]!.observeFn).toHaveBeenCalled();
    });

    it('should disconnect ResizeObserver on unmount', () => {
      const data = createFrequencyData();
      const { unmount } = render(
        <div style={{ width: '200px', height: '100px' }}>
          <WaveformVisualizer frequencyData={data} isActive={false} />
        </div>
      );

      const observer = resizeObserverInstances[0];

      unmount();

      expect(observer!.disconnectFn).toHaveBeenCalled();
    });
  });

  describe('configurable props', () => {
    it('should accept custom barCount', () => {
      const data = createFrequencyData([100, 150, 200, 250]);
      render(<WaveformVisualizer frequencyData={data} isActive={false} barCount={16} />);

      // Component renders without error
      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });

    it('should accept custom barGap', () => {
      const data = createFrequencyData([100, 150, 200]);
      render(<WaveformVisualizer frequencyData={data} isActive={false} barGap={4} />);

      // Component renders without error
      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });

    it('should accept custom barRadius', () => {
      const data = createFrequencyData([100, 150, 200]);
      render(<WaveformVisualizer frequencyData={data} isActive={false} barRadius={4} />);

      // Component renders without error
      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });
  });

  describe('high DPI support', () => {
    it('should handle high devicePixelRatio', () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2,
        writable: true,
      });

      const data = createFrequencyData([100, 150, 200]);
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      // Component should render and draw without error
      expect(mockRoundRect).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty frequency data', () => {
      const data = new Uint8Array(0);
      render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });

    it('should handle very large frequency data', () => {
      const data = new Uint8Array(8192);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.floor(Math.random() * 256);
      }
      render(<WaveformVisualizer frequencyData={data} isActive={true} />);

      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });

    it('should handle barCount larger than data length', () => {
      const data = new Uint8Array(16);
      render(<WaveformVisualizer frequencyData={data} isActive={false} barCount={64} />);

      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });

    it('should handle barCount of 1', () => {
      const data = createFrequencyData([200]);
      render(<WaveformVisualizer frequencyData={data} isActive={true} barCount={1} />);

      expect(screen.getByTestId('waveform-visualizer')).toBeInTheDocument();
    });
  });

  describe('state transitions', () => {
    it('should transition from inactive to active smoothly', () => {
      const data = createFrequencyData([100, 150, 200]);
      const { rerender } = render(<WaveformVisualizer frequencyData={data} isActive={false} />);

      // Start as inactive
      expect(screen.getByTestId('waveform-canvas')).toHaveAttribute(
        'aria-label',
        'Audio waveform visualization - idle'
      );

      // Transition to active
      rerender(<WaveformVisualizer frequencyData={data} isActive={true} />);

      expect(screen.getByTestId('waveform-canvas')).toHaveAttribute(
        'aria-label',
        'Audio waveform visualization - active'
      );
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should transition from active to inactive and stop animation', () => {
      const data = createFrequencyData([100, 150, 200]);
      const { rerender } = render(<WaveformVisualizer frequencyData={data} isActive={true} />);

      // Run initial animation
      runAnimationFrame();

      // Transition to inactive
      rerender(<WaveformVisualizer frequencyData={data} isActive={false} />);

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should update visualization when frequencyData changes', () => {
      const data1 = createFrequencyData([100, 100, 100]);
      const data2 = createFrequencyData([200, 200, 200]);

      const { rerender } = render(<WaveformVisualizer frequencyData={data1} isActive={true} />);

      // Clear mock counts
      mockClearRect.mockClear();

      // Update frequency data
      rerender(<WaveformVisualizer frequencyData={data2} isActive={true} />);

      // Run animation frame to see the update
      runAnimationFrame();

      // Canvas should be cleared and redrawn
      expect(mockClearRect).toHaveBeenCalled();
    });
  });
});
