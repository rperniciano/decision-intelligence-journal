/**
 * RecordDecisionPage - Main page for recording a decision
 *
 * A minimal, mobile-first interface for voice recording that captures
 * the user's decision context. After recording, shows a preview with
 * options to re-listen, retry, or continue to the next step.
 *
 * States:
 * - idle: Ready to record, showing VoiceRecorder component
 * - preview: Recording complete, showing audio player and action buttons
 *
 * @see US-038 in PRD
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceRecorder } from '../components/audio';

/**
 * Page states for the recording flow
 */
type PageState = 'idle' | 'preview';

/**
 * Props for the preview action buttons
 */
interface PreviewActionsProps {
  audioUrl: string;
  onReplay: () => void;
  onRetry: () => void;
  onContinue: () => void;
  isPlaying: boolean;
}

/**
 * Play icon SVG component
 */
function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Pause icon SVG component
 */
function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Refresh icon SVG component for retry button
 */
function RefreshIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Arrow right icon SVG component for continue button
 */
function ArrowRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.97 3.97a.75.75 0 011.06 0l7.5 7.5a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 11-1.06-1.06l6.22-6.22H3a.75.75 0 010-1.5h16.19l-6.22-6.22a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Preview action buttons component
 * Shows audio player and buttons: Riascolta, Riprova, Continua
 */
function PreviewActions({
  audioUrl,
  onReplay,
  onRetry,
  onContinue,
  isPlaying,
}: PreviewActionsProps) {
  const buttonBaseClasses = [
    'px-5 py-3',
    'rounded-lg',
    'flex items-center justify-center gap-2',
    'font-medium text-sm',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'transition-colors duration-200',
    'min-h-[48px]',
  ].join(' ');

  return (
    <div
      className="flex flex-col items-center gap-6 w-full max-w-md"
      role="region"
      aria-label="Anteprima registrazione"
      data-testid="preview-section"
    >
      {/* Hidden audio element for programmatic control */}
      <audio src={audioUrl} className="hidden" data-testid="preview-audio" />

      {/* Action buttons in a row */}
      <div className="flex gap-3 w-full">
        {/* Riascolta button */}
        <button
          type="button"
          onClick={onReplay}
          className={`${buttonBaseClasses} flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-400`}
          aria-label={isPlaying ? 'Metti in pausa' : 'Riascolta registrazione'}
          data-testid="replay-button"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
          <span>Riascolta</span>
        </button>

        {/* Riprova button */}
        <button
          type="button"
          onClick={onRetry}
          className={`${buttonBaseClasses} flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-400`}
          aria-label="Riprova registrazione"
          data-testid="retry-button"
        >
          <RefreshIcon />
          <span>Riprova</span>
        </button>

        {/* Continua button */}
        <button
          type="button"
          onClick={onContinue}
          className={`${buttonBaseClasses} flex-1 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500`}
          aria-label="Continua al prossimo passo"
          data-testid="continue-button"
        >
          <span>Continua</span>
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
}

/**
 * RecordDecisionPage component
 *
 * Main page for recording a decision. Shows a minimal interface with:
 * - Title: "Parla della tua decisione"
 * - Subtitle hint explaining what to describe
 * - VoiceRecorder component for recording
 * - Preview state with Riascolta, Riprova, Continua buttons
 */
export default function RecordDecisionPage() {
  // Page state: idle (recording) or preview
  const [pageState, setPageState] = useState<PageState>('idle');

  // Audio blob from recording
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  // Audio URL for preview playback
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Audio element ref for playback control
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Is audio currently playing
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * Handle recording completion from VoiceRecorder
   */
  const handleRecordingComplete = useCallback((blob: Blob) => {
    setAudioBlob(blob);

    // Create object URL for playback
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);

    // Transition to preview state
    setPageState('preview');
  }, []);

  /**
   * Handle replay button click
   */
  const handleReplay = useCallback(() => {
    if (!audioRef.current) {
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        // Handle play failure silently
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  /**
   * Handle retry button click
   */
  const handleRetry = useCallback(() => {
    // Clean up audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    // Reset state
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setPageState('idle');
  }, [audioUrl]);

  /**
   * Handle continue button click
   * TODO: Navigate to next step (transcription/extraction)
   */
  const handleContinue = useCallback(() => {
    // Placeholder: will navigate to next step in future stories
    // For now, just log the action
    console.log('Continue clicked with audio blob:', audioBlob?.size, 'bytes');

    // TODO: Upload audio and navigate to transcription step
    // This will be implemented in US-041
  }, [audioBlob]);

  /**
   * Handle audio ended event
   */
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  /**
   * Set up audio element event listeners
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.addEventListener('ended', handleAudioEnded);

    return () => {
      audio.removeEventListener('ended', handleAudioEnded);
    };
  }, [handleAudioEnded, audioUrl]);

  /**
   * Cleanup audio URL on unmount
   */
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div
      className="min-h-screen bg-white flex flex-col"
      data-testid="record-decision-page"
      data-state={pageState}
    >
      {/* Main content - centered and takes full height */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Header text */}
        <div className="text-center mb-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Parla della tua decisione
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Descrivi la situazione, le opzioni che stai considerando, e cosa ti preoccupa o ti entusiasma di questa scelta.
          </p>
        </div>

        {/* Recording state: Show VoiceRecorder */}
        {pageState === 'idle' && (
          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            maxDuration={300}
            className="w-full max-w-md"
          />
        )}

        {/* Preview state: Show audio preview and action buttons */}
        {pageState === 'preview' && audioUrl && (
          <>
            {/* Audio element for playback */}
            <audio
              ref={audioRef}
              src={audioUrl}
              className="hidden"
              data-testid="audio-player"
            />

            {/* Success message */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-8 h-8 text-green-600"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Registrazione completata
              </h2>
              <p className="text-gray-500 text-sm">
                Ascolta la tua registrazione o continua per analizzarla
              </p>
            </div>

            {/* Preview actions */}
            <PreviewActions
              audioUrl={audioUrl}
              onReplay={handleReplay}
              onRetry={handleRetry}
              onContinue={handleContinue}
              isPlaying={isPlaying}
            />
          </>
        )}
      </main>

      {/* Footer with tip */}
      <footer className="p-4 text-center">
        <p className="text-gray-400 text-xs">
          {pageState === 'idle'
            ? 'Durata massima: 5 minuti'
            : 'Premi Continua per procedere con la trascrizione'}
        </p>
      </footer>
    </div>
  );
}
