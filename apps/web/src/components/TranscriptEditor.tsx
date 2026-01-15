/**
 * TranscriptEditor component for editing transcribed audio
 *
 * Displays an editable textarea with character count, auto-resize,
 * and action buttons for saving or retrying transcription.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface TranscriptEditorProps {
  /** The transcript text to display and edit */
  transcript: string;
  /** Callback when user saves the transcript */
  onSave: (editedTranscript: string) => void;
  /** Callback when user wants to retry (re-record) */
  onRetry: () => void;
  /** Whether the save action is in progress */
  isSaving?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Save icon for the save button
 */
function SaveIcon() {
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
        d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Refresh icon for the retry button
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
 * TranscriptEditor component with auto-resizing textarea and action buttons
 *
 * @example
 * ```tsx
 * <TranscriptEditor
 *   transcript="Trascrizione del testo..."
 *   onSave={(edited) => saveTranscript(edited)}
 *   onRetry={() => restartRecording()}
 * />
 * ```
 */
export default function TranscriptEditor({
  transcript,
  onSave,
  onRetry,
  isSaving = false,
  className = '',
}: TranscriptEditorProps) {
  const [editedText, setEditedText] = useState(transcript);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when transcript prop changes
  useEffect(() => {
    setEditedText(transcript);
  }, [transcript]);

  // Auto-resize textarea to fit content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight (minimum 120px)
      const newHeight = Math.max(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Adjust height on text change
  useEffect(() => {
    adjustTextareaHeight();
  }, [editedText, adjustTextareaHeight]);

  // Adjust height on initial mount and window resize
  useEffect(() => {
    adjustTextareaHeight();
    window.addEventListener('resize', adjustTextareaHeight);
    return () => window.removeEventListener('resize', adjustTextareaHeight);
  }, [adjustTextareaHeight]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedText(e.target.value);
  }, []);

  const handleSave = useCallback(() => {
    onSave(editedText);
  }, [editedText, onSave]);

  const characterCount = editedText.length;
  const hasChanges = editedText !== transcript;

  const buttonBaseClasses = [
    // Size and padding
    'px-6 py-3',
    'rounded-lg',
    // Flexbox for icon + text
    'flex items-center justify-center gap-2',
    // Font styling
    'font-medium text-sm',
    // Focus states for accessibility
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900',
    // Transition for smooth state changes
    'transition-all duration-200 ease-in-out',
    // Touch/click behavior
    'cursor-pointer select-none',
    // Minimum touch target size
    'min-h-[48px]',
  ].join(' ');

  const retryButtonClasses = [
    buttonBaseClasses,
    'bg-slate-700 hover:bg-slate-600',
    'text-slate-200',
    'focus:ring-slate-400',
  ].join(' ');

  const saveButtonClasses = [
    buttonBaseClasses,
    'bg-emerald-600 hover:bg-emerald-700',
    'text-white',
    'focus:ring-emerald-400',
    isSaving ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ');

  return (
    <div
      className={`flex flex-col gap-4 w-full max-w-2xl ${className}`.trim()}
      role="region"
      aria-label="Transcript editor"
    >
      {/* Header with title and character count */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Trascrizione</h2>
        <span className="text-sm text-slate-400" aria-label={`${characterCount} characters`}>
          {characterCount.toLocaleString()} caratteri
        </span>
      </div>

      {/* Editable textarea */}
      <textarea
        ref={textareaRef}
        value={editedText}
        onChange={handleTextChange}
        className={[
          'w-full',
          'min-h-[120px]',
          'p-4',
          'rounded-lg',
          'bg-slate-800',
          'border border-slate-700',
          'text-slate-100',
          'placeholder-slate-500',
          'resize-none',
          'overflow-hidden',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
          'transition-all duration-200',
        ].join(' ')}
        placeholder="La trascrizione apparirà qui..."
        aria-label="Edit transcript"
      />

      {/* Change indicator */}
      {hasChanges && (
        <p className="text-sm text-amber-400" role="status">
          Modifiche non salvate
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-4 w-full">
        <button
          type="button"
          onClick={onRetry}
          className={retryButtonClasses}
          aria-label="Retry recording"
        >
          <RefreshIcon />
          <span>Riprova</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={saveButtonClasses}
          aria-label="Save transcript"
        >
          <SaveIcon />
          <span>{isSaving ? 'Salvando...' : 'Salva'}</span>
        </button>
      </div>
    </div>
  );
}
