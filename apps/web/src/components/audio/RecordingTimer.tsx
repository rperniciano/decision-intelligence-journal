/**
 * Props for the RecordingTimer component
 */
export interface RecordingTimerProps {
  /** Number of seconds elapsed */
  seconds: number;
  /** Whether the timer is actively counting (affects color) */
  isActive: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Threshold in seconds for showing warning color (default: 300 = 5 minutes) */
  warningThreshold?: number;
}

/**
 * Formats seconds into MM:SS format
 */
function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * A timer display component for showing recording duration.
 *
 * Features:
 * - MM:SS format (e.g., 01:23)
 * - Monospace font to prevent layout shift during counting
 * - Color states:
 *   - Gray (text-gray-500): when idle (isActive = false)
 *   - Red (text-red-500): when active (isActive = true)
 *   - Orange (text-orange-500): warning state after threshold (default 5 minutes)
 *
 * @example
 * ```tsx
 * const { recordingTime, isRecording } = useMediaRecorder();
 *
 * <RecordingTimer
 *   seconds={recordingTime}
 *   isActive={isRecording}
 * />
 * ```
 */
export default function RecordingTimer({
  seconds,
  isActive,
  className = '',
  warningThreshold = 300, // 5 minutes in seconds
}: RecordingTimerProps) {
  // Determine the text color based on state
  const isWarning = isActive && seconds >= warningThreshold;

  let textColorClass: string;
  if (!isActive) {
    textColorClass = 'text-gray-500';
  } else if (isWarning) {
    textColorClass = 'text-orange-500';
  } else {
    textColorClass = 'text-red-500';
  }

  return (
    <div
      data-testid="recording-timer"
      className={`font-mono text-2xl tabular-nums ${textColorClass} ${className}`}
      role="timer"
      aria-live="polite"
      aria-label={`Tempo di registrazione: ${formatTime(seconds)}`}
    >
      {formatTime(seconds)}
    </div>
  );
}

export { formatTime };
