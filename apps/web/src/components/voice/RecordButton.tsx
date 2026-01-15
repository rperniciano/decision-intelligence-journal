/**
 * RecordButton component for voice recording
 *
 * Displays a large button that toggles between idle (mic icon) and
 * recording (stop icon) states with appropriate animations.
 */

interface RecordButtonProps {
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Callback when button is clicked */
  onClick: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Microphone icon for idle state
 */
function MicIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-8 h-8"
      aria-hidden="true"
    >
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

/**
 * Stop icon for recording state
 */
function StopIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-8 h-8"
      aria-hidden="true"
    >
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

/**
 * RecordButton component with idle/recording states and pulse animation
 *
 * @example
 * ```tsx
 * <RecordButton
 *   isRecording={isRecording}
 *   onClick={() => isRecording ? stopRecording() : startRecording()}
 * />
 * ```
 */
export default function RecordButton({
  isRecording,
  onClick,
  disabled = false,
  className = '',
}: RecordButtonProps) {
  const baseClasses = [
    // Size and shape - min 48x48px for touch targets
    'w-20 h-20',
    'rounded-full',
    // Flexbox for centering icon
    'flex items-center justify-center',
    // Focus states for accessibility
    'focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900',
    // Transition for smooth state changes
    'transition-all duration-200 ease-in-out',
    // Touch/click behavior
    'cursor-pointer select-none',
  ].join(' ');

  const stateClasses = isRecording
    ? [
        // Recording state: red with pulse animation
        'bg-red-500 hover:bg-red-600',
        'text-white',
        'animate-pulse',
        'focus:ring-red-400',
        'shadow-lg shadow-red-500/50',
      ].join(' ')
    : [
        // Idle state: blue/indigo
        'bg-indigo-600 hover:bg-indigo-700',
        'text-white',
        'focus:ring-indigo-400',
        'shadow-lg shadow-indigo-500/30',
      ].join(' ');

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : '';

  const ariaLabel = isRecording ? 'Stop recording' : 'Start recording';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={isRecording}
      className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`.trim()}
    >
      {isRecording ? <StopIcon /> : <MicIcon />}
    </button>
  );
}
