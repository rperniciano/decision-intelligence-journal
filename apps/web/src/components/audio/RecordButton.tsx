/**
 * Props for the RecordButton component
 */
export interface RecordButtonProps {
  /** Callback when recording should start */
  onStart: () => void;
  /** Callback when recording should stop */
  onStop: () => void;
  /** Whether the button is currently in recording state */
  isRecording: boolean;
  /** Whether the button is disabled */
  isDisabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A large circular button for starting/stopping audio recording.
 *
 * Features:
 * - 80px circular button with microphone icon
 * - Idle state: gray background, dark icon
 * - Recording state: red pulsing background, white icon
 * - Smooth pulse animation during recording
 * - Touch-friendly (min 44px touch target - actually 80px)
 * - Accessible with aria-label and visible focus ring
 *
 * @example
 * ```tsx
 * const { isRecording, startRecording, stopRecording } = useMediaRecorder();
 *
 * <RecordButton
 *   onStart={startRecording}
 *   onStop={stopRecording}
 *   isRecording={isRecording}
 * />
 * ```
 */
export default function RecordButton({
  onStart,
  onStop,
  isRecording,
  isDisabled = false,
  className = '',
}: RecordButtonProps) {
  const handleClick = () => {
    if (isDisabled) {
      return;
    }

    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Handle Enter and Space for keyboard accessibility
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isDisabled}
      aria-label={isRecording ? 'Ferma registrazione' : 'Inizia registrazione'}
      aria-pressed={isRecording}
      className={`
        relative
        flex
        h-20
        w-20
        items-center
        justify-center
        rounded-full
        transition-all
        duration-200
        focus:outline-none
        focus:ring-4
        focus:ring-offset-2
        ${
          isRecording
            ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-300'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300'
        }
        ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}
      `}
      data-testid="record-button"
    >
      {/* Pulse animation ring for recording state */}
      {isRecording && !isDisabled && (
        <span
          className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-75"
          data-testid="pulse-animation"
          aria-hidden="true"
        />
      )}

      {/* Microphone icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="relative z-10 h-10 w-10"
        aria-hidden="true"
        data-testid="microphone-icon"
      >
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    </button>
  );
}
