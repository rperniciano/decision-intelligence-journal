/**
 * VoiceCapture page component
 *
 * Main page for voice recording that orchestrates the full recording flow.
 * States: Idle → Recording → Preview → Uploading → Transcribing → Complete/Error
 *
 * Features:
 * - Full-screen minimal UI with centered recording interface
 * - Permission handling with helpful error messages
 * - Recording duration timer
 * - Audio preview with playback and actions
 * - Upload progress and transcription status
 * - "Semi-closed eyes" design for minimal distraction
 */

import { useState, useCallback } from 'react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import {
  RecordButton,
  RecordingTimer,
  AudioPreview,
  PermissionError,
} from '../components/voice';
import TranscriptEditor from '../components/TranscriptEditor';
import type { PermissionErrorType } from '../components/voice/PermissionError';

/**
 * Recording flow states
 * Extended to include upload/transcription states
 */
type RecordingFlowState =
  | 'idle'
  | 'recording'
  | 'preview'
  | 'uploading'
  | 'transcribing'
  | 'complete'
  | 'error';

/**
 * Transcription result from the backend API
 */
interface TranscriptionResult {
  decisionId: string;
  transcript: string;
  audioUrl: string;
}

/**
 * Upload error with user-friendly message
 */
interface UploadError {
  code: string;
  message: string;
}

/**
 * Map error types from the hook to PermissionError component types
 */
function mapErrorTypeToPermissionError(
  errorType: string
): PermissionErrorType {
  switch (errorType) {
    case 'permission_denied':
      return 'denied';
    case 'browser_unsupported':
      return 'unsupported';
    case 'no_microphone':
      return 'not-found';
    default:
      return 'generic';
  }
}

/**
 * VoiceCapture page component
 *
 * Assembles all voice recording components into a complete recording flow.
 * Handles state transitions and error states gracefully.
 *
 * @example
 * ```tsx
 * // In router configuration
 * <Route path="/record" element={<VoiceCapture />} />
 * ```
 */
export default function VoiceCapture() {
  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    error,
    permissionState,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoiceRecorder();

  // Upload/transcription flow state
  const [uploadFlowState, setUploadFlowState] = useState<
    'idle' | 'uploading' | 'transcribing' | 'complete' | 'error'
  >('idle');
  const [transcriptionResult, setTranscriptionResult] =
    useState<TranscriptionResult | null>(null);
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Determine the current flow state based on recording and upload state
   */
  const getFlowState = useCallback((): RecordingFlowState => {
    // Upload/transcription states take priority
    if (uploadFlowState === 'uploading') {
      return 'uploading';
    }
    if (uploadFlowState === 'transcribing') {
      return 'transcribing';
    }
    if (uploadFlowState === 'complete') {
      return 'complete';
    }
    if (uploadFlowState === 'error') {
      return 'error';
    }

    // Recording states
    if (audioUrl) {
      return 'preview';
    }
    if (isRecording) {
      return 'recording';
    }
    return 'idle';
  }, [audioUrl, isRecording, uploadFlowState]);

  const flowState = getFlowState();

  /**
   * Handle record button click
   * Toggles between starting and stopping recording
   */
  const handleRecordClick = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  /**
   * Handle delete and retry action
   * Resets the recording state to allow a new recording
   */
  const handleDelete = useCallback(() => {
    resetRecording();
  }, [resetRecording]);

  /**
   * Handle confirm action - triggers upload and transcription flow
   * Sends FormData to backend endpoint for transcription
   */
  const handleConfirm = useCallback(async () => {
    if (!audioBlob) {
      return;
    }

    // Reset any previous upload state
    setUploadError(null);
    setTranscriptionResult(null);

    // Start upload flow
    setUploadFlowState('uploading');

    try {
      // Create FormData with the audio blob
      const formData = new FormData();
      const audioFile = new File([audioBlob], 'recording.webm', {
        type: audioBlob.type || 'audio/webm',
      });
      formData.append('audio', audioFile);

      // Get API URL from environment
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      // Transition to transcribing state when upload is sent
      // Note: The actual upload and transcription happen in one request
      // but we show "transcribing" after the request is made
      setUploadFlowState('transcribing');

      // Send POST request to backend
      const response = await fetch(`${apiUrl}/decisions/voice`, {
        method: 'POST',
        body: formData,
      });

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        // Handle error response from backend
        const errorData = data as { code?: string; message?: string };
        throw new Error(errorData.message || 'Upload failed');
      }

      // Success - store transcription result
      const result = data as { decisionId: string; transcript: string; audioUrl: string };
      setTranscriptionResult({
        decisionId: result.decisionId,
        transcript: result.transcript,
        audioUrl: result.audioUrl,
      });
      setUploadFlowState('complete');
    } catch (err) {
      // Handle errors
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setUploadError({
        code: 'UPLOAD_ERROR',
        message: errorMessage,
      });
      setUploadFlowState('error');
    }
  }, [audioBlob]);

  /**
   * Handle retry from error state
   * Returns to idle state for a new recording
   */
  const handleRetryFromError = useCallback(() => {
    setUploadFlowState('idle');
    setUploadError(null);
    resetRecording();
  }, [resetRecording]);

  /**
   * Handle retry from complete state
   * Returns to idle state for a new recording
   */
  const handleRetryFromComplete = useCallback(() => {
    setUploadFlowState('idle');
    setTranscriptionResult(null);
    resetRecording();
  }, [resetRecording]);

  /**
   * Handle save transcript action
   * Placeholder for saving edited transcript to backend
   */
  const handleSaveTranscript = useCallback(
    async (editedTranscript: string) => {
      setIsSaving(true);
      try {
        // TODO: Implement actual save to backend
        // For now, just log the save action
        // This will be implemented when we add transcript editing feature
        void editedTranscript;

        // After saving, reset to idle for new recording
        setUploadFlowState('idle');
        setTranscriptionResult(null);
        resetRecording();
      } finally {
        setIsSaving(false);
      }
    },
    [resetRecording]
  );

  /**
   * Check if we should show an error state
   * Permission errors and browser unsupported states block the UI
   */
  const shouldShowError =
    error &&
    (error.type === 'permission_denied' ||
      error.type === 'browser_unsupported' ||
      error.type === 'no_microphone');

  /**
   * Check if we should show a warning (non-blocking error)
   */
  const shouldShowWarning =
    error &&
    (error.type === 'recording_too_short' ||
      error.type === 'max_duration_reached' ||
      error.type === 'recording_error');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-6">
      {/* Page header */}
      <header className="absolute top-0 left-0 right-0 p-6">
        <h1 className="text-lg font-semibold text-slate-400 text-center">
          Voice Recording
        </h1>
      </header>

      {/* Main content area */}
      <main className="flex flex-col items-center justify-center gap-8 w-full max-w-md">
        {/* Error state - blocking errors */}
        {shouldShowError && error && (
          <PermissionError
            errorType={mapErrorTypeToPermissionError(error.type)}
            message={error.message}
            onRetry={
              permissionState !== 'unsupported' ? startRecording : undefined
            }
          />
        )}

        {/* Idle state - ready to record */}
        {!shouldShowError && flowState === 'idle' && (
          <>
            {/* Warning message for non-blocking errors */}
            {shouldShowWarning && error && (
              <div
                className="w-full bg-amber-900/50 border border-amber-700 rounded-lg p-4 text-center"
                role="alert"
                aria-live="polite"
              >
                <p className="text-amber-200 text-sm">{error.message}</p>
              </div>
            )}

            {/* Instruction text */}
            <p className="text-slate-400 text-center">
              Tap the button to start recording
            </p>

            {/* Record button */}
            <RecordButton
              isRecording={false}
              onClick={handleRecordClick}
              disabled={permissionState === 'unsupported'}
            />
          </>
        )}

        {/* Recording state - actively recording */}
        {!shouldShowError && flowState === 'recording' && (
          <>
            {/* Recording indicator */}
            <div className="flex items-center gap-2 text-red-400">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium uppercase tracking-wide">
                Recording
              </span>
            </div>

            {/* Timer */}
            <RecordingTimer duration={duration} />

            {/* Stop button */}
            <RecordButton
              isRecording={true}
              onClick={handleRecordClick}
            />

            {/* Help text */}
            <p className="text-slate-500 text-sm text-center">
              Tap to stop recording
            </p>
          </>
        )}

        {/* Preview state - review and confirm recording */}
        {!shouldShowError && flowState === 'preview' && audioUrl && (
          <>
            {/* Warning message for non-blocking errors */}
            {shouldShowWarning && error && (
              <div
                className="w-full bg-amber-900/50 border border-amber-700 rounded-lg p-4 text-center"
                role="alert"
                aria-live="polite"
              >
                <p className="text-amber-200 text-sm">{error.message}</p>
              </div>
            )}

            {/* Preview header */}
            <div className="text-center">
              <h2 className="text-lg font-medium text-slate-200">
                Review Your Recording
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Listen back before confirming
              </p>
            </div>

            {/* Audio preview with actions */}
            <AudioPreview
              audioUrl={audioUrl}
              onDelete={handleDelete}
              onConfirm={handleConfirm}
              isConfirming={uploadFlowState === 'uploading'}
            />
          </>
        )}

        {/* Uploading state - sending audio to backend */}
        {flowState === 'uploading' && (
          <div className="flex flex-col items-center gap-6" role="status" aria-live="polite">
            {/* Spinner */}
            <div className="w-16 h-16 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />

            {/* Status text */}
            <div className="text-center">
              <h2 className="text-lg font-medium text-slate-200">
                Uploading...
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Sending your recording to the server
              </p>
            </div>
          </div>
        )}

        {/* Transcribing state - waiting for transcription */}
        {flowState === 'transcribing' && (
          <div className="flex flex-col items-center gap-6" role="status" aria-live="polite">
            {/* Spinner */}
            <div className="w-16 h-16 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />

            {/* Status text */}
            <div className="text-center">
              <h2 className="text-lg font-medium text-slate-200">
                Transcribing...
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Converting your voice to text
              </p>
              <p className="text-slate-500 text-xs mt-2">
                This may take a minute
              </p>
            </div>
          </div>
        )}

        {/* Complete state - show transcript editor */}
        {flowState === 'complete' && transcriptionResult && (
          <TranscriptEditor
            transcript={transcriptionResult.transcript}
            onSave={handleSaveTranscript}
            onRetry={handleRetryFromComplete}
            isSaving={isSaving}
          />
        )}

        {/* Error state - upload or transcription failed */}
        {flowState === 'error' && uploadError && (
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            {/* Error icon */}
            <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-8 h-8 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>

            {/* Error message */}
            <div className="text-center">
              <h2 className="text-lg font-medium text-slate-200">
                Something went wrong
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {uploadError.message}
              </p>
            </div>

            {/* Retry button */}
            <button
              type="button"
              onClick={handleRetryFromError}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>
          </div>
        )}
      </main>

      {/* Footer with tips */}
      <footer className="absolute bottom-0 left-0 right-0 p-6">
        <p className="text-slate-600 text-xs text-center">
          {flowState === 'recording'
            ? 'Recording continues even if you switch tabs'
            : flowState === 'preview'
              ? 'You can delete and try again if needed'
              : flowState === 'uploading'
                ? 'Please wait while we upload your recording'
                : flowState === 'transcribing'
                  ? 'Transcription usually takes 30-60 seconds'
                  : flowState === 'complete'
                    ? 'You can edit the transcript before saving'
                    : flowState === 'error'
                      ? 'Your original recording is preserved'
                      : 'Max recording time: 5 minutes'}
        </p>
      </footer>
    </div>
  );
}
