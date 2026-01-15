import { useRef, useEffect, useCallback } from 'react';

/**
 * Props for the WaveformVisualizer component
 */
export interface WaveformVisualizerProps {
  /** Frequency data array from useAudioAnalyser (0-255 values) */
  frequencyData: Uint8Array;
  /** Whether the visualizer is actively receiving audio data */
  isActive: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** Number of bars to display. Defaults to 32 */
  barCount?: number;
  /** Minimum height of bars in pixels when idle. Defaults to 3 */
  minBarHeight?: number;
  /** Gap between bars in pixels. Defaults to 2 */
  barGap?: number;
  /** Bar border radius in pixels. Defaults to 2 */
  barRadius?: number;
}

/**
 * A canvas-based audio waveform visualizer component.
 * Renders animated vertical bars based on frequency data.
 *
 * Features:
 * - Smooth 60fps animation using requestAnimationFrame
 * - Blue/purple gradient coloring
 * - Responsive sizing
 * - Minimum bar height for idle state
 * - Configurable bar count, gap, and styling
 *
 * @example
 * ```tsx
 * const { frequencyData, isActive } = useAudioAnalyser();
 *
 * <WaveformVisualizer
 *   frequencyData={frequencyData}
 *   isActive={isActive}
 *   className="h-20"
 * />
 * ```
 */
export default function WaveformVisualizer({
  frequencyData,
  isActive,
  className = '',
  barCount = 32,
  minBarHeight = 3,
  barGap = 2,
  barRadius = 2,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Sample the frequency data to get the specified number of bars
   */
  const sampleFrequencyData = useCallback(
    (data: Uint8Array, numBars: number): number[] => {
      const samples: number[] = [];
      const step = Math.max(1, Math.floor(data.length / numBars));

      for (let i = 0; i < numBars; i++) {
        const index = Math.min(i * step, data.length - 1);
        // Average a few samples for smoother visualization
        let sum = 0;
        let count = 0;
        for (let j = 0; j < step && index + j < data.length; j++) {
          sum += data[index + j]!;
          count++;
        }
        samples.push(count > 0 ? sum / count : 0);
      }

      return samples;
    },
    []
  );

  /**
   * Draw the waveform bars on the canvas
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Get canvas dimensions
    const { width, height } = canvas;
    const dpr = window.devicePixelRatio || 1;
    const scaledWidth = width / dpr;
    const scaledHeight = height / dpr;

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Sample the frequency data
    const samples = sampleFrequencyData(frequencyData, barCount);

    // Calculate bar dimensions
    const totalGapWidth = (barCount - 1) * barGap;
    const barWidth = (scaledWidth - totalGapWidth) / barCount;

    // Create gradient for bars
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#3B82F6'); // blue-500
    gradient.addColorStop(0.5, '#6366F1'); // indigo-500
    gradient.addColorStop(1, '#8B5CF6'); // violet-500

    // Draw bars
    ctx.fillStyle = gradient;

    samples.forEach((value, index) => {
      // Normalize the value (0-255) to a height percentage
      const normalizedValue = value / 255;

      // Calculate bar height with minimum
      const barHeight = isActive
        ? Math.max(minBarHeight * dpr, normalizedValue * scaledHeight * dpr * 0.9)
        : minBarHeight * dpr;

      // Calculate bar position
      const x = index * (barWidth + barGap) * dpr;
      const y = height - barHeight;

      // Draw rounded rectangle
      const radius = Math.min(barRadius * dpr, barWidth * dpr / 2, barHeight / 2);
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth * dpr, barHeight, radius);
      ctx.fill();
    });

    // Continue animation loop if active
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(draw);
    }
  }, [frequencyData, isActive, barCount, minBarHeight, barGap, barRadius, sampleFrequencyData]);

  /**
   * Handle canvas resize for responsive behavior
   */
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    // Get the device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size to match parent container
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale canvas context
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Redraw after resize
    draw();
  }, [draw]);

  // Set up resize observer for responsive behavior
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    // Initial resize
    handleResize();

    // Set up ResizeObserver for responsive behavior
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [handleResize]);

  // Animation loop
  useEffect(() => {
    // Start animation if active
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(draw);
    } else {
      // Draw once to show idle state
      draw();
    }

    return () => {
      // Cleanup animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive, draw]);

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      data-testid="waveform-visualizer"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        data-testid="waveform-canvas"
        aria-label={isActive ? 'Audio waveform visualization - active' : 'Audio waveform visualization - idle'}
        role="img"
      />
    </div>
  );
}
