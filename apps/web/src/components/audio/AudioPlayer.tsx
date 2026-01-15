import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Props for the AudioPlayer component
 */
export interface AudioPlayerProps {
  /** Audio source - can be a URL string or a Blob */
  src: string | Blob;
  /** Callback when audio playback ends */
  onEnded?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats seconds into MM:SS format
 */
function formatDuration(totalSeconds: number): string {
  const roundedSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * A compact audio player component for playback of audio recordings.
 *
 * Features:
 * - Play/pause toggle button
 * - Visual progress bar with click-to-seek
 * - Current time / total duration display
 * - Keyboard accessible controls
 * - Compact horizontal layout
 * - Works with both URL strings and Blob objects
 *
 * @example
 * ```tsx
 * // With URL
 * <AudioPlayer
 *   src="https://example.com/audio.mp3"
 *   onEnded={() => console.log('Finished')}
 * />
 *
 * // With Blob
 * const { audioBlob } = useMediaRecorder();
 * {audioBlob && <AudioPlayer src={audioBlob} />}
 * ```
 */
export default function AudioPlayer({
  src,
  onEnded,
  className = '',
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Get the audio source URL (converting Blob if needed)
  const audioSrc = typeof src === 'string' ? src : objectUrlRef.current;

  // Create object URL for Blob sources
  useEffect(() => {
    if (src instanceof Blob) {
      objectUrlRef.current = URL.createObjectURL(src);
    }

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [src]);

  // Handle play/pause toggle
  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
    }
  }, [isPlaying]);

  // Handle seeking via progress bar click
  const handleProgressClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      const progressBar = progressRef.current;
      if (!audio || !progressBar || duration === 0) {
        return;
      }

      const rect = progressBar.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      audio.currentTime = percentage * duration;
    },
    [duration]
  );

  // Handle keyboard interaction on progress bar
  const handleProgressKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const audio = audioRef.current;
      if (!audio || duration === 0) {
        return;
      }

      const skipAmount = 5; // seconds
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        audio.currentTime = Math.max(0, audio.currentTime - skipAmount);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        audio.currentTime = Math.min(duration, audio.currentTime + skipAmount);
      }
    },
    [duration]
  );

  // Handle keyboard for play/pause button
  const handlePlayKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        togglePlayPause();
      }
    },
    [togglePlayPause]
  );

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration);
      setIsLoaded(true);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    onEnded?.();
  }, [onEnded]);

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg bg-gray-50 p-3 ${className}`}
      data-testid="audio-player"
      role="region"
      aria-label="Lettore audio"
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        data-testid="audio-element"
        preload="metadata"
      />

      {/* Play/Pause button */}
      <button
        type="button"
        onClick={togglePlayPause}
        onKeyDown={handlePlayKeyDown}
        disabled={!isLoaded}
        aria-label={isPlaying ? 'Pausa' : 'Riproduci'}
        className={`
          flex
          h-10
          w-10
          flex-shrink-0
          items-center
          justify-center
          rounded-full
          transition-colors
          focus:outline-none
          focus:ring-2
          focus:ring-blue-500
          focus:ring-offset-2
          ${isLoaded ? 'bg-blue-500 text-white hover:bg-blue-600' : 'cursor-not-allowed bg-gray-300 text-gray-500'}
        `}
        data-testid="play-pause-button"
      >
        {isPlaying ? (
          // Pause icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
            data-testid="pause-icon"
          >
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          // Play icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
            data-testid="play-icon"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress bar container */}
      <div className="flex flex-1 flex-col gap-1">
        <div
          ref={progressRef}
          role="slider"
          tabIndex={0}
          aria-label="Progresso audio"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-valuetext={`${formatDuration(currentTime)} di ${formatDuration(duration)}`}
          onClick={handleProgressClick}
          onKeyDown={handleProgressKeyDown}
          className="relative h-2 cursor-pointer rounded-full bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="progress-bar"
        >
          {/* Progress fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-blue-500 transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
            data-testid="progress-fill"
          />
          {/* Progress thumb */}
          <div
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-blue-600 shadow transition-all duration-100"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
            data-testid="progress-thumb"
            aria-hidden="true"
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between text-xs text-gray-500">
          <span className="font-mono tabular-nums" data-testid="current-time">
            {formatDuration(currentTime)}
          </span>
          <span className="font-mono tabular-nums" data-testid="total-duration">
            {formatDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

export { formatDuration };
