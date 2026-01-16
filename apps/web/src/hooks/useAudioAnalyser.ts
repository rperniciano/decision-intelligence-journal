import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Return type for the useAudioAnalyser hook
 */
export interface UseAudioAnalyserReturn {
  /** Current frequency data from the audio stream (0-255 values) */
  frequencyData: Uint8Array;
  /** Current time-domain waveform data (0-255 values) */
  timeData: Uint8Array;
  /** Whether the analyser is currently active */
  isActive: boolean;
  /** Error message if setup fails */
  error: string | null;
  /** Start analysing the provided MediaStream */
  startAnalysing: (stream: MediaStream) => void;
  /** Stop analysing and cleanup resources */
  stopAnalysing: () => void;
}

/**
 * Configuration options for the analyser
 */
export interface UseAudioAnalyserOptions {
  /** FFT size for frequency analysis. Must be a power of 2 between 32 and 32768. Default: 256 */
  fftSize?: number;
  /** Minimum decibel value for frequency data scaling. Default: -90 */
  minDecibels?: number;
  /** Maximum decibel value for frequency data scaling. Default: -10 */
  maxDecibels?: number;
  /** Smoothing time constant (0-1). Higher values = smoother but slower response. Default: 0.8 */
  smoothingTimeConstant?: number;
}

const DEFAULT_OPTIONS: Required<UseAudioAnalyserOptions> = {
  fftSize: 256,
  minDecibels: -90,
  maxDecibels: -10,
  smoothingTimeConstant: 0.8,
};

/**
 * Hook for analysing audio from a MediaStream using Web Audio API.
 * Provides real-time frequency and time-domain data for audio visualization.
 *
 * @param options - Configuration options for the analyser
 * @returns Object containing frequency data, time data, and control functions
 *
 * @example
 * ```tsx
 * const { frequencyData, timeData, isActive, startAnalysing, stopAnalysing } = useAudioAnalyser();
 *
 * // Start analysing when you have a MediaStream
 * startAnalysing(mediaStream);
 *
 * // Use frequencyData and timeData for visualization
 * // Data updates via requestAnimationFrame while active
 * ```
 */
export function useAudioAnalyser(
  options: UseAudioAnalyserOptions = {}
): UseAudioAnalyserReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // State for the data arrays
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(
    () => new Uint8Array(opts.fftSize / 2)
  );
  const [timeData, setTimeData] = useState<Uint8Array>(
    () => new Uint8Array(opts.fftSize / 2)
  );
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for Web Audio API objects
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Internal data arrays (avoid creating new arrays every frame)
  // Use explicit ArrayBuffer type for Web Audio API compatibility
  const frequencyDataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeDataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  /**
   * Animation loop for updating frequency and time data
   */
  const updateData = useCallback(() => {
    if (!analyserRef.current || !frequencyDataArrayRef.current || !timeDataArrayRef.current) {
      return;
    }

    // Get current frequency data
    analyserRef.current.getByteFrequencyData(frequencyDataArrayRef.current);

    // Get current time-domain data
    analyserRef.current.getByteTimeDomainData(timeDataArrayRef.current);

    // Update state with new data (create new Uint8Array to trigger re-render)
    // Copy the data to new arrays to ensure React detects the change
    const newFrequencyData = new Uint8Array(frequencyDataArrayRef.current.length);
    newFrequencyData.set(frequencyDataArrayRef.current);
    setFrequencyData(newFrequencyData);

    const newTimeData = new Uint8Array(timeDataArrayRef.current.length);
    newTimeData.set(timeDataArrayRef.current);
    setTimeData(newTimeData);

    // Continue the animation loop
    animationFrameRef.current = requestAnimationFrame(updateData);
  }, []);

  /**
   * Start analysing the provided MediaStream
   */
  const startAnalysing = useCallback(
    (stream: MediaStream) => {
      try {
        // Clean up any existing audio context
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
        }

        // Create new AudioContext
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) {
          setError('Web Audio API non supportato dal browser');
          return;
        }

        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        // Create analyser node with options
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = opts.fftSize;
        analyser.minDecibels = opts.minDecibels;
        analyser.maxDecibels = opts.maxDecibels;
        analyser.smoothingTimeConstant = opts.smoothingTimeConstant;
        analyserRef.current = analyser;

        // Create source from MediaStream
        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Connect source to analyser (no need to connect to destination for analysis only)
        source.connect(analyser);

        // Initialize data arrays
        const bufferLength = analyser.frequencyBinCount; // fftSize / 2
        frequencyDataArrayRef.current = new Uint8Array(new ArrayBuffer(bufferLength));
        timeDataArrayRef.current = new Uint8Array(new ArrayBuffer(bufferLength));

        // Reset state arrays to match buffer length
        setFrequencyData(new Uint8Array(bufferLength));
        setTimeData(new Uint8Array(bufferLength));
        setError(null);
        setIsActive(true);

        // Start the animation loop
        animationFrameRef.current = requestAnimationFrame(updateData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Errore durante l\'inizializzazione dell\'analizzatore audio';
        setError(message);
        setIsActive(false);
      }
    },
    [opts.fftSize, opts.minDecibels, opts.maxDecibels, opts.smoothingTimeConstant, updateData]
  );

  /**
   * Stop analysing and cleanup all resources
   */
  const stopAnalysing = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect and cleanup source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Cleanup analyser
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Reset internal arrays
    frequencyDataArrayRef.current = null;
    timeDataArrayRef.current = null;

    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysing();
    };
  }, [stopAnalysing]);

  return {
    frequencyData,
    timeData,
    isActive,
    error,
    startAnalysing,
    stopAnalysing,
  };
}

export default useAudioAnalyser;
