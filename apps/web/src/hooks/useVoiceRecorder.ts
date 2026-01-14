import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Permission states for microphone access
 */
export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

/**
 * Error types for voice recording
 */
export type RecordingErrorType =
  | 'permission_denied'
  | 'no_microphone'
  | 'browser_unsupported'
  | 'recording_error'
  | 'max_duration_reached'
  | 'recording_too_short';

/**
 * Recording error with type and message
 */
export interface RecordingError {
  type: RecordingErrorType;
  message: string;
}

/**
 * Return type for useVoiceRecorder hook
 */
export interface UseVoiceRecorderReturn {
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Whether recording is paused */
  isPaused: boolean;
  /** Current recording duration in seconds */
  duration: number;
  /** Recorded audio as Blob */
  audioBlob: Blob | null;
  /** Object URL for audio playback */
  audioUrl: string | null;
  /** Current error state */
  error: RecordingError | null;
  /** Current microphone permission state */
  permissionState: PermissionState;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => void;
  /** Pause recording */
  pauseRecording: () => void;
  /** Resume recording */
  resumeRecording: () => void;
  /** Reset to initial state */
  resetRecording: () => void;
}

/** Maximum recording duration in seconds (5 minutes) */
const MAX_DURATION_SECONDS = 300;

/** Minimum recording duration in seconds */
const MIN_DURATION_SECONDS = 2;

/**
 * Get the best supported MIME type for audio recording
 */
function getSupportedMimeType(): string | undefined {
  const mimeTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/wav',
  ];

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return undefined;
}

/**
 * Check if the browser supports MediaRecorder API
 */
function isMediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' &&
         typeof navigator.mediaDevices !== 'undefined' &&
         typeof navigator.mediaDevices.getUserMedia !== 'undefined';
}

/**
 * Custom hook for voice recording using MediaRecorder API
 *
 * Manages recording state, permissions, and provides methods for
 * controlling the recording lifecycle.
 *
 * @example
 * ```tsx
 * const { isRecording, startRecording, stopRecording, audioUrl } = useVoiceRecorder();
 *
 * return (
 *   <button onClick={isRecording ? stopRecording : startRecording}>
 *     {isRecording ? 'Stop' : 'Record'}
 *   </button>
 * );
 * ```
 */
export function useVoiceRecorder(): UseVoiceRecorderReturn {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<RecordingError | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');

  // Refs for cleanup
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);

  // Check browser support on mount
  useEffect(() => {
    if (!isMediaRecorderSupported()) {
      setPermissionState('unsupported');
    }
  }, []);

  // Timer for recording duration
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Auto-stop at max duration
  useEffect(() => {
    if (duration >= MAX_DURATION_SECONDS && isRecording) {
      stopRecording();
      setError({
        type: 'max_duration_reached',
        message: 'Recording stopped: maximum duration reached (5 minutes)',
      });
    }
  }, [duration, isRecording]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      // Stop any active stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /**
   * Clean up the current audio URL
   */
  const cleanupAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
  }, []);

  /**
   * Stop all tracks in the media stream
   */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  /**
   * Start recording audio from the microphone
   */
  const startRecording = useCallback(async () => {
    // Check browser support
    if (!isMediaRecorderSupported()) {
      setPermissionState('unsupported');
      setError({
        type: 'browser_unsupported',
        message: 'Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.',
      });
      return;
    }

    // Reset state
    setError(null);
    cleanupAudioUrl();
    setAudioBlob(null);
    chunksRef.current = [];
    setDuration(0);

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionState('granted');

      // Get supported MIME type
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm'
        });
        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);

        setIsRecording(false);
        setIsPaused(false);
        stopStream();
      };

      // Handle recording errors
      mediaRecorder.onerror = () => {
        setError({
          type: 'recording_error',
          message: 'An error occurred during recording. Please try again.',
        });
        setIsRecording(false);
        setIsPaused(false);
        stopStream();
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      stopStream();

      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotAllowedError':
            setPermissionState('denied');
            setError({
              type: 'permission_denied',
              message: 'Microphone permission was denied. Please allow microphone access in your browser settings.',
            });
            break;
          case 'NotFoundError':
            setError({
              type: 'no_microphone',
              message: 'No microphone was found. Please connect a microphone and try again.',
            });
            break;
          case 'NotSupportedError':
            setPermissionState('unsupported');
            setError({
              type: 'browser_unsupported',
              message: 'Your browser does not support audio recording.',
            });
            break;
          default:
            setError({
              type: 'recording_error',
              message: 'Failed to start recording. Please try again.',
            });
        }
      } else {
        setError({
          type: 'recording_error',
          message: 'An unexpected error occurred. Please try again.',
        });
      }
    }
  }, [cleanupAudioUrl, stopStream]);

  /**
   * Stop the current recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Check minimum duration
      if (duration < MIN_DURATION_SECONDS) {
        setError({
          type: 'recording_too_short',
          message: 'Recording is too short. Please record for at least 2 seconds.',
        });
      }

      mediaRecorderRef.current.stop();
    }
  }, [duration]);

  /**
   * Pause the current recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  /**
   * Resume the current recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  /**
   * Reset all recording state to initial values
   */
  const resetRecording = useCallback(() => {
    // Stop any active recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    stopStream();
    cleanupAudioUrl();

    mediaRecorderRef.current = null;
    chunksRef.current = [];

    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setAudioBlob(null);
    setError(null);
  }, [stopStream, cleanupAudioUrl]);

  return {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error,
    permissionState,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  };
}
