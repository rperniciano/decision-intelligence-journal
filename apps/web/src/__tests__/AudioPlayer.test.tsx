import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AudioPlayer, { formatDuration } from '../components/audio/AudioPlayer';

// Mock HTMLAudioElement
class MockHTMLAudioElement {
  src = '';
  currentTime = 0;
  duration = 60; // 1 minute default
  paused = true;
  preload = '';

  private onLoadedMetadata: (() => void) | null = null;
  private onTimeUpdate: (() => void) | null = null;
  private onPlay: (() => void) | null = null;
  private onPause: (() => void) | null = null;
  private onEnded: (() => void) | null = null;

  set onloadedmetadata(fn: (() => void) | null) {
    this.onLoadedMetadata = fn;
  }
  set ontimeupdate(fn: (() => void) | null) {
    this.onTimeUpdate = fn;
  }
  set onplay(fn: (() => void) | null) {
    this.onPlay = fn;
  }
  set onpause(fn: (() => void) | null) {
    this.onPause = fn;
  }
  set onended(fn: (() => void) | null) {
    this.onEnded = fn;
  }

  play = vi.fn(() => {
    this.paused = false;
    this.onPlay?.();
    return Promise.resolve();
  });

  pause = vi.fn(() => {
    this.paused = true;
    this.onPause?.();
  });

  // Trigger methods for tests
  triggerLoadedMetadata() {
    this.onLoadedMetadata?.();
  }

  triggerTimeUpdate(time?: number) {
    if (time !== undefined) {
      this.currentTime = time;
    }
    this.onTimeUpdate?.();
  }

  triggerEnded() {
    this.paused = true;
    this.onEnded?.();
  }
}

// Store instances for test access
let mockAudioInstances: MockHTMLAudioElement[] = [];

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

describe('formatDuration', () => {
  it('formats 0 seconds as 00:00', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('formats seconds under a minute correctly', () => {
    expect(formatDuration(30)).toBe('00:30');
    expect(formatDuration(5)).toBe('00:05');
    expect(formatDuration(59)).toBe('00:59');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatDuration(60)).toBe('01:00');
    expect(formatDuration(90)).toBe('01:30');
    expect(formatDuration(125)).toBe('02:05');
    expect(formatDuration(300)).toBe('05:00');
  });

  it('handles double-digit minutes', () => {
    expect(formatDuration(600)).toBe('10:00');
    expect(formatDuration(3599)).toBe('59:59');
    expect(formatDuration(3600)).toBe('60:00');
  });

  it('floors decimal seconds', () => {
    expect(formatDuration(30.7)).toBe('00:30');
    expect(formatDuration(90.999)).toBe('01:30');
  });
});

describe('AudioPlayer', () => {
  beforeEach(() => {
    mockAudioInstances = [];
    vi.spyOn(window, 'Audio').mockImplementation(() => {
      const instance = new MockHTMLAudioElement();
      mockAudioInstances.push(instance);
      return instance as unknown as HTMLAudioElement;
    });
    URL.createObjectURL = mockCreateObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the audio player container', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('audio-player')).toBeInTheDocument();
    });

    it('renders with correct region role and aria-label', () => {
      render(<AudioPlayer src="test.mp3" />);
      const player = screen.getByTestId('audio-player');
      expect(player).toHaveAttribute('role', 'region');
      expect(player).toHaveAttribute('aria-label', 'Lettore audio');
    });

    it('applies custom className', () => {
      render(<AudioPlayer src="test.mp3" className="custom-class" />);
      expect(screen.getByTestId('audio-player')).toHaveClass('custom-class');
    });

    it('renders hidden audio element', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('audio-element')).toBeInTheDocument();
    });

    it('renders play/pause button', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('play-pause-button')).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('renders time displays', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('current-time')).toBeInTheDocument();
      expect(screen.getByTestId('total-duration')).toBeInTheDocument();
    });
  });

  describe('Audio Source Handling', () => {
    it('sets audio src for string URL', () => {
      render(<AudioPlayer src="https://example.com/audio.mp3" />);
      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      expect(audio.src).toContain('audio.mp3');
    });

    it('creates object URL for Blob source', () => {
      const blob = new Blob(['audio data'], { type: 'audio/mp3' });
      render(<AudioPlayer src={blob} />);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    });

    it('revokes object URL on unmount', () => {
      const blob = new Blob(['audio data'], { type: 'audio/mp3' });
      const { unmount } = render(<AudioPlayer src={blob} />);
      unmount();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('Play/Pause Button', () => {
    it('shows play icon initially', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('pause-icon')).not.toBeInTheDocument();
    });

    it('has aria-label "Riproduci" when not playing', async () => {
      render(<AudioPlayer src="test.mp3" />);

      // Trigger metadata loaded
      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).toHaveAttribute(
          'aria-label',
          'Riproduci'
        );
      });
    });

    it('is disabled before audio metadata loads', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('play-pause-button')).toBeDisabled();
    });

    it('is enabled after audio metadata loads', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });
    });

    it('calls audio.play() when clicked while paused', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      const playMock = vi.spyOn(audio, 'play').mockResolvedValue();

      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('play-pause-button'));
      expect(playMock).toHaveBeenCalled();
    });

    it('calls audio.pause() when clicked while playing', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      vi.spyOn(audio, 'play').mockResolvedValue();
      const pauseMock = vi.spyOn(audio, 'pause');

      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });

      // Start playing
      fireEvent.click(screen.getByTestId('play-pause-button'));
      fireEvent.play(audio);

      // Click again to pause
      fireEvent.click(screen.getByTestId('play-pause-button'));
      expect(pauseMock).toHaveBeenCalled();
    });

    it('shows pause icon when playing', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      vi.spyOn(audio, 'play').mockResolvedValue();

      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('play-pause-button'));
      fireEvent.play(audio);

      await waitFor(() => {
        expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
        expect(screen.queryByTestId('play-icon')).not.toBeInTheDocument();
      });
    });

    it('has aria-label "Pausa" when playing', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      vi.spyOn(audio, 'play').mockResolvedValue();

      fireEvent.loadedMetadata(audio);
      fireEvent.click(screen.getByTestId('play-pause-button'));
      fireEvent.play(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).toHaveAttribute(
          'aria-label',
          'Pausa'
        );
      });
    });
  });

  describe('Keyboard Accessibility - Play Button', () => {
    it('toggles play on Enter key', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      const playMock = vi.spyOn(audio, 'play').mockResolvedValue();

      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });

      fireEvent.keyDown(screen.getByTestId('play-pause-button'), {
        key: 'Enter',
      });
      expect(playMock).toHaveBeenCalled();
    });

    it('toggles play on Space key', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      const playMock = vi.spyOn(audio, 'play').mockResolvedValue();

      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });

      fireEvent.keyDown(screen.getByTestId('play-pause-button'), { key: ' ' });
      expect(playMock).toHaveBeenCalled();
    });

    it('does not toggle on other keys', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      const playMock = vi.spyOn(audio, 'play').mockResolvedValue();

      fireEvent.loadedMetadata(audio);

      fireEvent.keyDown(screen.getByTestId('play-pause-button'), { key: 'Tab' });
      expect(playMock).not.toHaveBeenCalled();
    });
  });

  describe('Progress Bar', () => {
    it('has correct ARIA attributes', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      // Mock duration
      Object.defineProperty(audio, 'duration', { value: 120, writable: true });
      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        const progressBar = screen.getByTestId('progress-bar');
        expect(progressBar).toHaveAttribute('role', 'slider');
        expect(progressBar).toHaveAttribute('aria-label', 'Progresso audio');
        expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        expect(progressBar).toHaveAttribute('aria-valuemax', '120');
        expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      });
    });

    it('updates progress fill width on time update', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 100, writable: true });
      fireEvent.loadedMetadata(audio);

      // Simulate time update to 25 seconds (25%)
      Object.defineProperty(audio, 'currentTime', { value: 25, writable: true });
      fireEvent.timeUpdate(audio);

      await waitFor(() => {
        const progressFill = screen.getByTestId('progress-fill');
        expect(progressFill).toHaveStyle({ width: '25%' });
      });
    });

    it('updates aria-valuenow on time update', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 60, writable: true });
      fireEvent.loadedMetadata(audio);

      Object.defineProperty(audio, 'currentTime', { value: 30, writable: true });
      fireEvent.timeUpdate(audio);

      await waitFor(() => {
        expect(screen.getByTestId('progress-bar')).toHaveAttribute(
          'aria-valuenow',
          '30'
        );
      });
    });
  });

  describe('Seek Functionality', () => {
    it('seeks to clicked position on progress bar', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 100, writable: true });
      fireEvent.loadedMetadata(audio);

      const progressBar = screen.getByTestId('progress-bar');

      // Mock getBoundingClientRect
      vi.spyOn(progressBar, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        right: 200,
        width: 200,
        top: 0,
        bottom: 10,
        height: 10,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Click at 50% (100px out of 200px)
      fireEvent.click(progressBar, { clientX: 100 });

      await waitFor(() => {
        expect(audio.currentTime).toBe(50);
      });
    });

    it('handles click at start of progress bar', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 100, writable: true });
      fireEvent.loadedMetadata(audio);

      const progressBar = screen.getByTestId('progress-bar');

      vi.spyOn(progressBar, 'getBoundingClientRect').mockReturnValue({
        left: 100,
        right: 300,
        width: 200,
        top: 0,
        bottom: 10,
        height: 10,
        x: 100,
        y: 0,
        toJSON: () => {},
      });

      // Click at the very start
      fireEvent.click(progressBar, { clientX: 100 });

      await waitFor(() => {
        expect(audio.currentTime).toBe(0);
      });
    });

    it('handles click at end of progress bar', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 100, writable: true });
      fireEvent.loadedMetadata(audio);

      const progressBar = screen.getByTestId('progress-bar');

      vi.spyOn(progressBar, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        right: 200,
        width: 200,
        top: 0,
        bottom: 10,
        height: 10,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Click at 100%
      fireEvent.click(progressBar, { clientX: 200 });

      await waitFor(() => {
        expect(audio.currentTime).toBe(100);
      });
    });
  });

  describe('Keyboard Accessibility - Progress Bar', () => {
    it('skips backward 5 seconds on ArrowLeft', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 100, writable: true });
      Object.defineProperty(audio, 'currentTime', { value: 50, writable: true });
      fireEvent.loadedMetadata(audio);

      fireEvent.keyDown(screen.getByTestId('progress-bar'), {
        key: 'ArrowLeft',
      });

      await waitFor(() => {
        expect(audio.currentTime).toBe(45);
      });
    });

    it('skips forward 5 seconds on ArrowRight', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 100, writable: true });
      Object.defineProperty(audio, 'currentTime', { value: 50, writable: true });
      fireEvent.loadedMetadata(audio);

      fireEvent.keyDown(screen.getByTestId('progress-bar'), {
        key: 'ArrowRight',
      });

      await waitFor(() => {
        expect(audio.currentTime).toBe(55);
      });
    });

    it('does not skip below 0 on ArrowLeft', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 100, writable: true });
      Object.defineProperty(audio, 'currentTime', { value: 2, writable: true });
      fireEvent.loadedMetadata(audio);

      fireEvent.keyDown(screen.getByTestId('progress-bar'), {
        key: 'ArrowLeft',
      });

      await waitFor(() => {
        expect(audio.currentTime).toBe(0);
      });
    });

    it('does not skip beyond duration on ArrowRight', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 100, writable: true });
      Object.defineProperty(audio, 'currentTime', { value: 98, writable: true });
      fireEvent.loadedMetadata(audio);

      fireEvent.keyDown(screen.getByTestId('progress-bar'), {
        key: 'ArrowRight',
      });

      await waitFor(() => {
        expect(audio.currentTime).toBe(100);
      });
    });

    it('progress bar is focusable', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('progress-bar')).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Time Display', () => {
    it('shows initial time as 00:00', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('current-time')).toHaveTextContent('00:00');
    });

    it('shows initial duration as 00:00', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('total-duration')).toHaveTextContent('00:00');
    });

    it('updates duration after metadata loads', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 150, writable: true }); // 2:30
      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(screen.getByTestId('total-duration')).toHaveTextContent('02:30');
      });
    });

    it('updates current time on time update', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 120, writable: true });
      fireEvent.loadedMetadata(audio);

      Object.defineProperty(audio, 'currentTime', { value: 65, writable: true }); // 1:05
      fireEvent.timeUpdate(audio);

      await waitFor(() => {
        expect(screen.getByTestId('current-time')).toHaveTextContent('01:05');
      });
    });

    it('uses monospace font for time displays', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('current-time')).toHaveClass('font-mono');
      expect(screen.getByTestId('total-duration')).toHaveClass('font-mono');
    });

    it('uses tabular-nums for consistent digit width', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('current-time')).toHaveClass('tabular-nums');
      expect(screen.getByTestId('total-duration')).toHaveClass('tabular-nums');
    });
  });

  describe('Playback Events', () => {
    it('calls onEnded when audio finishes', async () => {
      const onEnded = vi.fn();
      render(<AudioPlayer src="test.mp3" onEnded={onEnded} />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      fireEvent.loadedMetadata(audio);
      fireEvent.ended(audio);

      await waitFor(() => {
        expect(onEnded).toHaveBeenCalledTimes(1);
      });
    });

    it('resets to beginning when audio ends', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 60, writable: true });
      fireEvent.loadedMetadata(audio);

      // Simulate playing to middle
      Object.defineProperty(audio, 'currentTime', { value: 30, writable: true });
      fireEvent.timeUpdate(audio);

      // Audio ends
      fireEvent.ended(audio);

      await waitFor(() => {
        expect(screen.getByTestId('current-time')).toHaveTextContent('00:00');
        expect(audio.currentTime).toBe(0);
      });
    });

    it('shows play icon after audio ends', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      vi.spyOn(audio, 'play').mockResolvedValue();
      fireEvent.loadedMetadata(audio);

      // Start playing
      fireEvent.click(screen.getByTestId('play-pause-button'));
      fireEvent.play(audio);

      await waitFor(() => {
        expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
      });

      // Audio ends
      fireEvent.ended(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('has rounded-lg background', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('audio-player')).toHaveClass('rounded-lg', 'bg-gray-50');
    });

    it('play button has correct styling when disabled', () => {
      render(<AudioPlayer src="test.mp3" />);
      const button = screen.getByTestId('play-pause-button');
      expect(button).toHaveClass('bg-gray-300');
    });

    it('play button has correct styling when enabled', async () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        const button = screen.getByTestId('play-pause-button');
        expect(button).toHaveClass('bg-blue-500');
      });
    });

    it('progress bar has cursor-pointer', () => {
      render(<AudioPlayer src="test.mp3" />);
      expect(screen.getByTestId('progress-bar')).toHaveClass('cursor-pointer');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero duration gracefully', () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      Object.defineProperty(audio, 'duration', { value: 0, writable: true });
      fireEvent.loadedMetadata(audio);

      // Progress should be 0
      expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '0%' });
    });

    it('handles play error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      vi.spyOn(audio, 'play').mockRejectedValue(new Error('Play failed'));

      fireEvent.loadedMetadata(audio);

      await waitFor(() => {
        expect(screen.getByTestId('play-pause-button')).not.toBeDisabled();
      });

      fireEvent.click(screen.getByTestId('play-pause-button'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error playing audio:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('does not call onEnded if not provided', () => {
      render(<AudioPlayer src="test.mp3" />);

      const audio = screen.getByTestId('audio-element') as HTMLAudioElement;
      fireEvent.loadedMetadata(audio);

      // Should not throw
      expect(() => fireEvent.ended(audio)).not.toThrow();
    });
  });
});
