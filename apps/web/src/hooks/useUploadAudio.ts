/**
 * Hook for managing audio upload state
 *
 * Provides upload functionality with states: idle, uploading, success, error
 *
 * @see US-041 in PRD
 */

import { useState, useCallback } from 'react';
import type { AudioUploadResponse } from '@decisions/types';
import { uploadAudio, AudioUploadError, getUploadErrorMessage } from '../services/audio';
import { useAuth } from '../contexts/AuthContext';

/**
 * Upload state enum
 */
export type UploadState = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Return type for useUploadAudio hook
 */
export interface UseUploadAudioReturn {
  /** Current upload state */
  state: UploadState;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Upload result when successful */
  result: AudioUploadResponse | null;
  /** Error message when failed (user-friendly, in Italian) */
  error: string | null;
  /** Upload progress (0-100, only if XMLHttpRequest is used, otherwise null) */
  progress: number | null;
  /**
   * Upload an audio blob
   * @param blob - The audio blob to upload
   * @returns Promise with upload response
   * @throws AudioUploadError on failure
   */
  upload: (blob: Blob) => Promise<AudioUploadResponse>;
  /** Reset state back to idle */
  reset: () => void;
}

/**
 * Hook for uploading audio files with state management
 *
 * @example
 * ```tsx
 * const { upload, isUploading, error, result } = useUploadAudio();
 *
 * const handleContinue = async () => {
 *   try {
 *     const { url, path, size } = await upload(audioBlob);
 *     // Navigate to next step with audio URL
 *   } catch (err) {
 *     // Error is already set in hook state
 *   }
 * };
 * ```
 */
export function useUploadAudio(): UseUploadAudioReturn {
  const { session } = useAuth();
  const [state, setState] = useState<UploadState>('idle');
  const [result, setResult] = useState<AudioUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  /**
   * Reset state back to idle
   */
  const reset = useCallback(() => {
    setState('idle');
    setResult(null);
    setError(null);
    setProgress(null);
  }, []);

  /**
   * Upload an audio blob
   */
  const upload = useCallback(
    async (blob: Blob): Promise<AudioUploadResponse> => {
      // Check for session/token
      const accessToken = session?.access_token;
      if (!accessToken) {
        const err = new AudioUploadError('unauthorized', 'No session');
        setError(getUploadErrorMessage(err));
        setState('error');
        throw err;
      }

      // Reset and start upload
      setState('uploading');
      setError(null);
      setResult(null);
      setProgress(0);

      try {
        const response = await uploadAudio(blob, accessToken);
        setResult(response);
        setState('success');
        setProgress(100);
        return response;
      } catch (err) {
        const uploadError =
          err instanceof AudioUploadError
            ? err
            : new AudioUploadError('server_error', 'Unknown error');
        setError(getUploadErrorMessage(uploadError));
        setState('error');
        setProgress(null);
        throw uploadError;
      }
    },
    [session]
  );

  return {
    state,
    isUploading: state === 'uploading',
    result,
    error,
    progress,
    upload,
    reset,
  };
}
