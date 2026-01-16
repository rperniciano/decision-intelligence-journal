import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RecordingTimer, { formatTime } from '../components/audio/RecordingTimer';

describe('RecordingTimer', () => {
  describe('formatTime utility', () => {
    it('should format 0 seconds as 00:00', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    it('should format single digit seconds with leading zero', () => {
      expect(formatTime(5)).toBe('00:05');
    });

    it('should format double digit seconds correctly', () => {
      expect(formatTime(45)).toBe('00:45');
    });

    it('should format 60 seconds as 01:00', () => {
      expect(formatTime(60)).toBe('01:00');
    });

    it('should format 90 seconds as 01:30', () => {
      expect(formatTime(90)).toBe('01:30');
    });

    it('should format single digit minutes with leading zero', () => {
      expect(formatTime(120)).toBe('02:00');
    });

    it('should format 5 minutes correctly', () => {
      expect(formatTime(300)).toBe('05:00');
    });

    it('should format 10+ minutes correctly', () => {
      expect(formatTime(630)).toBe('10:30');
    });

    it('should format 59:59 correctly', () => {
      expect(formatTime(3599)).toBe('59:59');
    });

    it('should handle 60+ minutes correctly', () => {
      expect(formatTime(3660)).toBe('61:00');
    });
  });

  describe('Rendering', () => {
    it('should render the timer container', () => {
      render(<RecordingTimer seconds={0} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toBeInTheDocument();
    });

    it('should display time in MM:SS format', () => {
      render(<RecordingTimer seconds={83} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveTextContent('01:23');
    });

    it('should have role="timer" for accessibility', () => {
      render(<RecordingTimer seconds={0} isActive={false} />);

      const timer = screen.getByRole('timer');
      expect(timer).toBeInTheDocument();
    });

    it('should have aria-live="polite" for screen reader updates', () => {
      render(<RecordingTimer seconds={0} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-label with time description', () => {
      render(<RecordingTimer seconds={125} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveAttribute('aria-label', 'Tempo di registrazione: 02:05');
    });

    it('should apply custom className', () => {
      render(<RecordingTimer seconds={0} isActive={false} className="custom-class" />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('custom-class');
    });
  });

  describe('Monospace Font', () => {
    it('should have monospace font class', () => {
      render(<RecordingTimer seconds={0} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('font-mono');
    });

    it('should have tabular-nums for consistent digit width', () => {
      render(<RecordingTimer seconds={0} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('tabular-nums');
    });

    it('should have text-2xl for readable size', () => {
      render(<RecordingTimer seconds={0} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-2xl');
    });
  });

  describe('Idle State (isActive = false)', () => {
    it('should have gray color when idle', () => {
      render(<RecordingTimer seconds={0} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-gray-500');
    });

    it('should remain gray even when seconds are high', () => {
      render(<RecordingTimer seconds={500} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-gray-500');
    });

    it('should remain gray even above warning threshold', () => {
      render(<RecordingTimer seconds={350} isActive={false} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-gray-500');
      expect(timer).not.toHaveClass('text-orange-500');
    });
  });

  describe('Active State (isActive = true)', () => {
    it('should have red color when active', () => {
      render(<RecordingTimer seconds={0} isActive={true} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-red-500');
    });

    it('should remain red below warning threshold', () => {
      render(<RecordingTimer seconds={299} isActive={true} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-red-500');
      expect(timer).not.toHaveClass('text-orange-500');
    });
  });

  describe('Warning State', () => {
    it('should show orange color at exactly 5 minutes (300s)', () => {
      render(<RecordingTimer seconds={300} isActive={true} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-orange-500');
    });

    it('should show orange color after 5 minutes', () => {
      render(<RecordingTimer seconds={350} isActive={true} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-orange-500');
    });

    it('should not show red when in warning state', () => {
      render(<RecordingTimer seconds={300} isActive={true} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).not.toHaveClass('text-red-500');
    });

    it('should not show gray when in warning state', () => {
      render(<RecordingTimer seconds={300} isActive={true} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).not.toHaveClass('text-gray-500');
    });
  });

  describe('Custom Warning Threshold', () => {
    it('should use custom warningThreshold prop', () => {
      render(<RecordingTimer seconds={60} isActive={true} warningThreshold={60} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-orange-500');
    });

    it('should remain red below custom threshold', () => {
      render(<RecordingTimer seconds={59} isActive={true} warningThreshold={60} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-red-500');
    });

    it('should use higher custom threshold', () => {
      render(<RecordingTimer seconds={300} isActive={true} warningThreshold={600} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-red-500');
    });

    it('should show orange above higher custom threshold', () => {
      render(<RecordingTimer seconds={600} isActive={true} warningThreshold={600} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-orange-500');
    });
  });

  describe('State Transitions', () => {
    it('should transition from idle to active when isActive changes', () => {
      const { rerender } = render(<RecordingTimer seconds={30} isActive={false} />);

      let timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-gray-500');

      rerender(<RecordingTimer seconds={30} isActive={true} />);

      timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-red-500');
    });

    it('should transition from active to warning when seconds exceed threshold', () => {
      const { rerender } = render(<RecordingTimer seconds={299} isActive={true} />);

      let timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-red-500');

      rerender(<RecordingTimer seconds={300} isActive={true} />);

      timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-orange-500');
    });

    it('should transition from warning to idle when recording stops', () => {
      const { rerender } = render(<RecordingTimer seconds={350} isActive={true} />);

      let timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-orange-500');

      rerender(<RecordingTimer seconds={350} isActive={false} />);

      timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-gray-500');
    });

    it('should update displayed time when seconds change', () => {
      const { rerender } = render(<RecordingTimer seconds={0} isActive={true} />);

      expect(screen.getByTestId('recording-timer')).toHaveTextContent('00:00');

      rerender(<RecordingTimer seconds={65} isActive={true} />);

      expect(screen.getByTestId('recording-timer')).toHaveTextContent('01:05');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large seconds values', () => {
      render(<RecordingTimer seconds={36000} isActive={true} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveTextContent('600:00'); // 10 hours
      expect(timer).toHaveClass('text-orange-500');
    });

    it('should handle seconds = 0 with isActive = true', () => {
      render(<RecordingTimer seconds={0} isActive={true} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveTextContent('00:00');
      expect(timer).toHaveClass('text-red-500');
    });

    it('should handle warningThreshold = 0', () => {
      render(<RecordingTimer seconds={0} isActive={true} warningThreshold={0} />);

      const timer = screen.getByTestId('recording-timer');
      expect(timer).toHaveClass('text-orange-500');
    });

    it('should maintain aria-label accuracy when time changes', () => {
      const { rerender } = render(<RecordingTimer seconds={0} isActive={true} />);

      expect(screen.getByTestId('recording-timer')).toHaveAttribute(
        'aria-label',
        'Tempo di registrazione: 00:00'
      );

      rerender(<RecordingTimer seconds={125} isActive={true} />);

      expect(screen.getByTestId('recording-timer')).toHaveAttribute(
        'aria-label',
        'Tempo di registrazione: 02:05'
      );
    });
  });
});
