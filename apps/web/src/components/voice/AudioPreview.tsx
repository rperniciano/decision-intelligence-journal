/**
 * AudioPreview component for voice recording
 *
 * Displays a native audio player with action buttons for
 * deleting/retrying and confirming the recording.
 */

interface AudioPreviewProps {
  /** URL of the recorded audio (blob URL) */
  audioUrl: string;
  /** Callback when user wants to delete and retry */
  onDelete: () => void;
  /** Callback when user confirms the recording */
  onConfirm: () => void;
  /** Whether the confirm action is in progress */
  isConfirming?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Trash icon for delete button
 */
function TrashIcon() {
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
        d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Check icon for confirm button
 */
function CheckIcon() {
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
 * AudioPreview component with native player and action buttons
 *
 * @example
 * ```tsx
 * <AudioPreview
 *   audioUrl={audioUrl}
 *   onDelete={() => resetRecording()}
 *   onConfirm={() => handleConfirm()}
 * />
 * ```
 */
export default function AudioPreview({
  audioUrl,
  onDelete,
  onConfirm,
  isConfirming = false,
  className = '',
}: AudioPreviewProps) {
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

  const deleteButtonClasses = [
    buttonBaseClasses,
    'bg-slate-700 hover:bg-slate-600',
    'text-slate-200',
    'focus:ring-slate-400',
  ].join(' ');

  const confirmButtonClasses = [
    buttonBaseClasses,
    'bg-green-600 hover:bg-green-700',
    'text-white',
    'focus:ring-green-400',
    isConfirming ? 'opacity-50 cursor-not-allowed' : '',
  ].join(' ');

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full max-w-md ${className}`.trim()}
      role="region"
      aria-label="Audio preview"
    >
      {/* Native audio player */}
      <audio
        src={audioUrl}
        controls
        className="w-full rounded-lg"
        aria-label="Recorded audio preview"
      >
        Your browser does not support the audio element.
      </audio>

      {/* Action buttons */}
      <div className="flex gap-4 w-full">
        <button
          type="button"
          onClick={onDelete}
          className={deleteButtonClasses}
          aria-label="Delete recording and retry"
        >
          <TrashIcon />
          <span>Delete & Retry</span>
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirming}
          className={confirmButtonClasses}
          aria-label="Confirm recording"
        >
          <CheckIcon />
          <span>{isConfirming ? 'Confirming...' : 'Confirm'}</span>
        </button>
      </div>
    </div>
  );
}
