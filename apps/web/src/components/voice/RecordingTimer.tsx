/**
 * RecordingTimer component for voice recording
 *
 * Displays elapsed recording time in MM:SS format.
 * Only visible during active recording.
 */

interface RecordingTimerProps {
  /** Duration in seconds */
  duration: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats a duration in seconds to MM:SS format
 *
 * @param seconds - The duration in seconds
 * @returns Formatted string in MM:SS format (e.g., "01:30")
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(remainingSeconds).padStart(2, '0');
  return `${paddedMinutes}:${paddedSeconds}`;
}

/**
 * RecordingTimer component displaying elapsed time in MM:SS format
 *
 * @example
 * ```tsx
 * // Display 90 seconds as 01:30
 * <RecordingTimer duration={90} />
 *
 * // With custom styling
 * <RecordingTimer duration={duration} className="text-xl" />
 * ```
 */
export default function RecordingTimer({
  duration,
  className = '',
}: RecordingTimerProps) {
  const formattedTime = formatDuration(duration);

  return (
    <div
      className={`font-mono text-2xl font-semibold text-slate-200 tabular-nums ${className}`.trim()}
      role="timer"
      aria-label={`Recording time: ${formattedTime}`}
      aria-live="polite"
    >
      {formattedTime}
    </div>
  );
}
