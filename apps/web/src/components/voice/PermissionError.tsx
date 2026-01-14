/**
 * PermissionError component for voice recording
 *
 * Displays error messages for permission denied or browser unsupported states,
 * with helpful instructions and a retry button.
 */

import type { FC } from 'react';

/** Type of permission error */
export type PermissionErrorType = 'denied' | 'unsupported' | 'not-found' | 'generic';

interface PermissionErrorProps {
  /** Type of error to display */
  errorType: PermissionErrorType;
  /** Custom error message (overrides default) */
  message?: string;
  /** Callback when user clicks retry */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Warning/alert icon
 */
function AlertIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-12 h-12"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Microphone off/blocked icon
 */
function MicOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-12 h-12"
      aria-hidden="true"
    >
      <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
      <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
      <path
        fillRule="evenodd"
        d="M3.97 3.97a.75.75 0 011.06 0l14 14a.75.75 0 11-1.06 1.06l-14-14a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Refresh/retry icon
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
 * Get error details based on error type
 */
function getErrorDetails(errorType: PermissionErrorType): {
  title: string;
  description: string;
  instructions: string[];
  Icon: FC;
} {
  switch (errorType) {
    case 'denied':
      return {
        title: 'Microphone Access Denied',
        description:
          'We need access to your microphone to record audio. Please enable microphone permissions in your browser settings.',
        instructions: [
          'Click the lock/info icon in the address bar',
          'Find "Microphone" in the permissions list',
          'Change the setting to "Allow"',
          'Refresh the page and try again',
        ],
        Icon: MicOffIcon,
      };
    case 'unsupported':
      return {
        title: 'Browser Not Supported',
        description:
          'Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, Safari, or Edge.',
        instructions: [
          'Update your browser to the latest version',
          'Or try a different browser (Chrome, Firefox, Safari, Edge)',
          'Make sure JavaScript is enabled',
        ],
        Icon: AlertIcon,
      };
    case 'not-found':
      return {
        title: 'No Microphone Found',
        description:
          'We could not detect a microphone connected to your device. Please connect a microphone and try again.',
        instructions: [
          'Check that your microphone is properly connected',
          'Make sure your microphone is not muted at the hardware level',
          'Try using a different microphone if available',
          'Check your system sound settings',
        ],
        Icon: MicOffIcon,
      };
    case 'generic':
    default:
      return {
        title: 'Recording Error',
        description:
          'An error occurred while trying to access your microphone. Please try again.',
        instructions: [
          'Check your browser permissions',
          'Make sure no other app is using the microphone',
          'Try refreshing the page',
        ],
        Icon: AlertIcon,
      };
  }
}

/**
 * PermissionError component for displaying microphone permission and support errors
 *
 * @example
 * ```tsx
 * <PermissionError
 *   errorType="denied"
 *   onRetry={() => startRecording()}
 * />
 * ```
 */
export default function PermissionError({
  errorType,
  message,
  onRetry,
  className = '',
}: PermissionErrorProps) {
  const { title, description, instructions, Icon } = getErrorDetails(errorType);

  const buttonClasses = [
    // Size and padding
    'px-6 py-3',
    'rounded-lg',
    // Flexbox for icon + text
    'flex items-center justify-center gap-2',
    // Font styling
    'font-medium text-sm',
    // Colors
    'bg-indigo-600 hover:bg-indigo-700',
    'text-white',
    // Focus states for accessibility
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-400',
    // Transition for smooth state changes
    'transition-all duration-200 ease-in-out',
    // Touch/click behavior
    'cursor-pointer select-none',
    // Minimum touch target size
    'min-h-[48px]',
  ].join(' ');

  return (
    <div
      className={`flex flex-col items-center gap-6 w-full max-w-md text-center ${className}`.trim()}
      role="alert"
      aria-live="polite"
    >
      {/* Error icon */}
      <div className="text-amber-400">
        <Icon />
      </div>

      {/* Error title */}
      <h2 className="text-xl font-semibold text-slate-100">{title}</h2>

      {/* Error description */}
      <p className="text-slate-300 leading-relaxed">{message || description}</p>

      {/* Instructions list */}
      <div className="w-full text-left bg-slate-800/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-slate-200 mb-3">
          How to fix this:
        </h3>
        <ol className="space-y-2">
          {instructions.map((instruction, index) => (
            <li
              key={index}
              className="flex items-start gap-3 text-sm text-slate-400"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-medium">
                {index + 1}
              </span>
              <span>{instruction}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Retry button */}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={buttonClasses}
          aria-label="Retry recording"
        >
          <RefreshIcon />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
