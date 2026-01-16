import { useEffect, useRef, useCallback } from 'react';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import { useAudioAnalyser } from '../../hooks/useAudioAnalyser';
import RecordButton from './RecordButton';
import RecordingTimer from './RecordingTimer';
import WaveformVisualizer from './WaveformVisualizer';

/**
 * Possible states for the VoiceRecorder component
 */
export type VoiceRecorderState = 'idle' | 'requesting_permission' | 'recording' | 'stopped';

/**
 * Props for the VoiceRecorder component
 */
export interface VoiceRecorderProps {
  /** Callback when recording is complete with the audio blob */
  onRecordingComplete: (blob: Blob) => void;
  /** Maximum recording duration in seconds. Default: 300 (5 minutes) */
  maxDuration?: number;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * A composed voice recording component that combines RecordButton,
 * RecordingTimer, and WaveformVisualizer into a complete recording interface.
 *
 * Features:
 * - State management: idle, requesting_permission, recording, stopped
 * - Permission error handling with user-friendly messages in Italian
 * - Auto-stop when maxDuration is reached
 * - Real-time audio waveform visualization
 * - Centered, minimal layout focused on the record button
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const handleRecordingComplete = (blob: Blob) => {
 *     // Upload or process the audio blob
 *     console.log('Recording complete:', blob.size, 'bytes');
 *   };
 *
 *   return (
 *     <VoiceRecorder
 *       onRecordingComplete={handleRecordingComplete}
 *       maxDuration={180} // 3 minutes
 *     />
 *   );
 * }
 * ```
 */
export default function VoiceRecorder({
  onRecordingComplete,
  maxDuration = 300,
  className = '',
}: VoiceRecorderProps) {
  // Use media recorder hook for recording functionality
  const {
    isRecording,
    recordingTime,
    audioBlob,
    error: recorderError,
    permissionState,
    startRecording,
    stopRecording,
  } = useMediaRecorder();

  // Use audio analyser hook for waveform visualization
  const {
    frequencyData,
    isActive: isAnalyserActive,
    startAnalysing,
    stopAnalysing,
  } = useAudioAnalyser({ fftSize: 256 });

  // Ref to store the media stream for the analyser
  const streamRef = useRef<MediaStream | null>(null);

  // Track requesting permission state
  const isRequestingPermission = useRef(false);

  /**
   * Determine the current state of the recorder
   */
  const getRecorderState = useCallback((): VoiceRecorderState => {
    if (isRequestingPermission.current) {
      return 'requesting_permission';
    }
    if (audioBlob !== null) {
      return 'stopped';
    }
    if (isRecording) {
      return 'recording';
    }
    return 'idle';
  }, [audioBlob, isRecording]);

  /**
   * Handle starting the recording
   */
  const handleStart = useCallback(async () => {
    isRequestingPermission.current = true;

    try {
      // Request microphone access directly for the analyser
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Start the audio analyser with the stream
      startAnalysing(stream);

      // Start the media recorder
      await startRecording();
    } catch {
      // Error will be handled by the useMediaRecorder hook
    } finally {
      isRequestingPermission.current = false;
    }
  }, [startRecording, startAnalysing]);

  /**
   * Handle stopping the recording
   */
  const handleStop = useCallback(() => {
    stopRecording();
    stopAnalysing();

    // Stop the stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [stopRecording, stopAnalysing]);

  // Auto-stop when maxDuration is reached
  useEffect(() => {
    if (isRecording && recordingTime >= maxDuration) {
      handleStop();
    }
  }, [isRecording, recordingTime, maxDuration, handleStop]);

  // Call onRecordingComplete when audioBlob is available
  useEffect(() => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
    }
  }, [audioBlob, onRecordingComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysing();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stopAnalysing]);

  /**
   * Get the error message in Italian based on error type
   */
  const getErrorMessage = (): string | null => {
    if (permissionState === 'denied') {
      return 'Permesso microfono negato. Abilita l\'accesso al microfono nelle impostazioni del browser.';
    }
    if (permissionState === 'unsupported') {
      return 'Il tuo browser non supporta la registrazione audio. Usa un browser moderno come Chrome, Firefox o Edge.';
    }
    if (recorderError) {
      switch (recorderError.type) {
        case 'permission_denied':
          return 'Permesso microfono negato. Abilita l\'accesso al microfono nelle impostazioni del browser.';
        case 'no_microphone':
          return 'Nessun microfono trovato. Collega un microfono e riprova.';
        case 'browser_unsupported':
          return 'Il tuo browser non supporta la registrazione audio.';
        case 'max_duration_reached':
          return `Registrazione interrotta: durata massima raggiunta (${Math.floor(maxDuration / 60)} minuti).`;
        case 'recording_too_short':
          return 'Registrazione troppo breve. Registra almeno 2 secondi.';
        case 'recording_error':
        default:
          return 'Errore durante la registrazione. Riprova.';
      }
    }
    return null;
  };

  const errorMessage = getErrorMessage();
  const recorderState = getRecorderState();

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 ${className}`}
      data-testid="voice-recorder"
      data-state={recorderState}
    >
      {/* Waveform Visualizer */}
      <div className="h-20 w-full max-w-md">
        <WaveformVisualizer
          frequencyData={frequencyData}
          isActive={isAnalyserActive && isRecording}
          className="h-full w-full"
        />
      </div>

      {/* Recording Timer */}
      <RecordingTimer
        seconds={recordingTime}
        isActive={isRecording}
        warningThreshold={maxDuration}
      />

      {/* Record Button */}
      <RecordButton
        onStart={handleStart}
        onStop={handleStop}
        isRecording={isRecording}
        isDisabled={permissionState === 'unsupported'}
      />

      {/* Error Message */}
      {errorMessage && (
        <div
          className="max-w-md text-center text-sm text-red-600"
          role="alert"
          data-testid="error-message"
        >
          {errorMessage}
        </div>
      )}

      {/* Permission Request Message */}
      {recorderState === 'requesting_permission' && (
        <div
          className="text-center text-sm text-gray-500"
          data-testid="permission-message"
        >
          Richiesta permesso microfono...
        </div>
      )}
    </div>
  );
}
