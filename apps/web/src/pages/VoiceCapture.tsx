/**
 * VoiceCapture page component
 *
 * Main page for voice recording that orchestrates the full recording flow.
 * States: Idle → Recording → Preview → Confirm
 *
 * Features:
 * - Full-screen minimal UI with centered recording interface
 * - Permission handling with helpful error messages
 * - Recording duration timer
 * - Audio preview with playback and actions
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
import type { PermissionErrorType } from '../components/voice/PermissionError';

/**
 * Recording flow states
 */
type RecordingFlowState = 'idle' | 'recording' | 'preview';

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
    audioUrl,
    error,
    permissionState,
    startRecording,
    stopRecording,
    resetRecording,
  } = useVoiceRecorder();

  const [isConfirming, setIsConfirming] = useState(false);

  /**
   * Determine the current flow state based on recording state
   */
  const getFlowState = useCallback((): RecordingFlowState => {
    if (audioUrl) {
      return 'preview';
    }
    if (isRecording) {
      return 'recording';
    }
    return 'idle';
  }, [audioUrl, isRecording]);

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
   * Handle confirm action
   * For now, logs confirmation (future: save to backend)
   */
  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      // Future integration point: save audio to backend
      // For now, just log the confirmation
      // eslint-disable-next-line no-console
      console.log('Recording confirmed', { duration, audioUrl });

      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Reset after confirmation
      resetRecording();
    } finally {
      setIsConfirming(false);
    }
  }, [duration, audioUrl, resetRecording]);

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
              isConfirming={isConfirming}
            />
          </>
        )}
      </main>

      {/* Footer with tips */}
      <footer className="absolute bottom-0 left-0 right-0 p-6">
        <p className="text-slate-600 text-xs text-center">
          {flowState === 'recording'
            ? 'Recording continues even if you switch tabs'
            : flowState === 'preview'
              ? 'You can delete and try again if needed'
              : 'Max recording time: 5 minutes'}
        </p>
      </footer>
    </div>
  );
}
