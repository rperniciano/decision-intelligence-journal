import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecordButton from '../components/audio/RecordButton';

describe('RecordButton', () => {
  const defaultProps = {
    onStart: vi.fn(),
    onStop: vi.fn(),
    isRecording: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the record button', () => {
      render(<RecordButton {...defaultProps} />);

      const button = screen.getByTestId('record-button');
      expect(button).toBeInTheDocument();
    });

    it('should render the microphone icon', () => {
      render(<RecordButton {...defaultProps} />);

      const icon = screen.getByTestId('microphone-icon');
      expect(icon).toBeInTheDocument();
    });

    it('should be a button element', () => {
      render(<RecordButton {...defaultProps} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have type="button" to prevent form submission', () => {
      render(<RecordButton {...defaultProps} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should apply custom className', () => {
      render(<RecordButton {...defaultProps} className="custom-class" />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Idle State', () => {
    it('should have gray background in idle state', () => {
      render(<RecordButton {...defaultProps} isRecording={false} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('bg-gray-100');
    });

    it('should have dark text color in idle state', () => {
      render(<RecordButton {...defaultProps} isRecording={false} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('text-gray-700');
    });

    it('should have aria-label for starting recording in idle state', () => {
      render(<RecordButton {...defaultProps} isRecording={false} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveAttribute('aria-label', 'Inizia registrazione');
    });

    it('should have aria-pressed="false" in idle state', () => {
      render(<RecordButton {...defaultProps} isRecording={false} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveAttribute('aria-pressed', 'false');
    });

    it('should not show pulse animation in idle state', () => {
      render(<RecordButton {...defaultProps} isRecording={false} />);

      const pulse = screen.queryByTestId('pulse-animation');
      expect(pulse).not.toBeInTheDocument();
    });
  });

  describe('Recording State', () => {
    it('should have red background in recording state', () => {
      render(<RecordButton {...defaultProps} isRecording={true} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('bg-red-500');
    });

    it('should have white text color in recording state', () => {
      render(<RecordButton {...defaultProps} isRecording={true} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('text-white');
    });

    it('should have aria-label for stopping recording in recording state', () => {
      render(<RecordButton {...defaultProps} isRecording={true} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveAttribute('aria-label', 'Ferma registrazione');
    });

    it('should have aria-pressed="true" in recording state', () => {
      render(<RecordButton {...defaultProps} isRecording={true} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show pulse animation in recording state', () => {
      render(<RecordButton {...defaultProps} isRecording={true} />);

      const pulse = screen.getByTestId('pulse-animation');
      expect(pulse).toBeInTheDocument();
    });

    it('should have animate-ping class on pulse animation', () => {
      render(<RecordButton {...defaultProps} isRecording={true} />);

      const pulse = screen.getByTestId('pulse-animation');
      expect(pulse).toHaveClass('animate-ping');
    });

    it('should have aria-hidden on pulse animation', () => {
      render(<RecordButton {...defaultProps} isRecording={true} />);

      const pulse = screen.getByTestId('pulse-animation');
      expect(pulse).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Click Behavior', () => {
    it('should call onStart when clicked in idle state', () => {
      const onStart = vi.fn();
      render(<RecordButton {...defaultProps} onStart={onStart} isRecording={false} />);

      const button = screen.getByTestId('record-button');
      fireEvent.click(button);

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when clicked in recording state', () => {
      const onStop = vi.fn();
      render(<RecordButton {...defaultProps} onStop={onStop} isRecording={true} />);

      const button = screen.getByTestId('record-button');
      fireEvent.click(button);

      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('should not call onStart when disabled in idle state', () => {
      const onStart = vi.fn();
      render(<RecordButton {...defaultProps} onStart={onStart} isRecording={false} isDisabled={true} />);

      const button = screen.getByTestId('record-button');
      fireEvent.click(button);

      expect(onStart).not.toHaveBeenCalled();
    });

    it('should not call onStop when disabled in recording state', () => {
      const onStop = vi.fn();
      render(<RecordButton {...defaultProps} onStop={onStop} isRecording={true} isDisabled={true} />);

      const button = screen.getByTestId('record-button');
      fireEvent.click(button);

      expect(onStop).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should call onStart when Enter key is pressed in idle state', () => {
      const onStart = vi.fn();
      render(<RecordButton {...defaultProps} onStart={onStart} isRecording={false} />);

      const button = screen.getByTestId('record-button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when Enter key is pressed in recording state', () => {
      const onStop = vi.fn();
      render(<RecordButton {...defaultProps} onStop={onStop} isRecording={true} />);

      const button = screen.getByTestId('record-button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('should call onStart when Space key is pressed in idle state', () => {
      const onStart = vi.fn();
      render(<RecordButton {...defaultProps} onStart={onStart} isRecording={false} />);

      const button = screen.getByTestId('record-button');
      fireEvent.keyDown(button, { key: ' ' });

      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should call onStop when Space key is pressed in recording state', () => {
      const onStop = vi.fn();
      render(<RecordButton {...defaultProps} onStop={onStop} isRecording={true} />);

      const button = screen.getByTestId('record-button');
      fireEvent.keyDown(button, { key: ' ' });

      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it('should not trigger on other keys', () => {
      const onStart = vi.fn();
      render(<RecordButton {...defaultProps} onStart={onStart} isRecording={false} />);

      const button = screen.getByTestId('record-button');
      fireEvent.keyDown(button, { key: 'Tab' });
      fireEvent.keyDown(button, { key: 'Escape' });
      fireEvent.keyDown(button, { key: 'a' });

      expect(onStart).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should have disabled attribute when isDisabled is true', () => {
      render(<RecordButton {...defaultProps} isDisabled={true} />);

      const button = screen.getByTestId('record-button');
      expect(button).toBeDisabled();
    });

    it('should not have disabled attribute when isDisabled is false', () => {
      render(<RecordButton {...defaultProps} isDisabled={false} />);

      const button = screen.getByTestId('record-button');
      expect(button).not.toBeDisabled();
    });

    it('should have cursor-not-allowed class when disabled', () => {
      render(<RecordButton {...defaultProps} isDisabled={true} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('cursor-not-allowed');
    });

    it('should have opacity-50 class when disabled', () => {
      render(<RecordButton {...defaultProps} isDisabled={true} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('opacity-50');
    });

    it('should have cursor-pointer class when not disabled', () => {
      render(<RecordButton {...defaultProps} isDisabled={false} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('cursor-pointer');
    });

    it('should not show pulse animation when disabled even if recording', () => {
      render(<RecordButton {...defaultProps} isRecording={true} isDisabled={true} />);

      const pulse = screen.queryByTestId('pulse-animation');
      expect(pulse).not.toBeInTheDocument();
    });
  });

  describe('Size and Styling', () => {
    it('should have 80px width class (w-20 = 5rem = 80px)', () => {
      render(<RecordButton {...defaultProps} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('w-20');
    });

    it('should have 80px height class (h-20 = 5rem = 80px)', () => {
      render(<RecordButton {...defaultProps} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('h-20');
    });

    it('should be fully rounded (circular)', () => {
      render(<RecordButton {...defaultProps} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('rounded-full');
    });

    it('should have focus ring classes for accessibility', () => {
      render(<RecordButton {...defaultProps} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('focus:ring-4');
      expect(button).toHaveClass('focus:ring-offset-2');
      expect(button).toHaveClass('focus:outline-none');
    });

    it('should have transition classes for smooth state changes', () => {
      render(<RecordButton {...defaultProps} />);

      const button = screen.getByTestId('record-button');
      expect(button).toHaveClass('transition-all');
      expect(button).toHaveClass('duration-200');
    });
  });

  describe('Microphone Icon', () => {
    it('should have aria-hidden on microphone icon', () => {
      render(<RecordButton {...defaultProps} />);

      const icon = screen.getByTestId('microphone-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have relative z-10 class for proper layering', () => {
      render(<RecordButton {...defaultProps} />);

      const icon = screen.getByTestId('microphone-icon');
      expect(icon).toHaveClass('relative');
      expect(icon).toHaveClass('z-10');
    });

    it('should have appropriate size classes (h-10 w-10 = 40px)', () => {
      render(<RecordButton {...defaultProps} />);

      const icon = screen.getByTestId('microphone-icon');
      expect(icon).toHaveClass('h-10');
      expect(icon).toHaveClass('w-10');
    });
  });

  describe('State Transitions', () => {
    it('should change from idle to recording state correctly', () => {
      const { rerender } = render(<RecordButton {...defaultProps} isRecording={false} />);

      let button = screen.getByTestId('record-button');
      expect(button).toHaveClass('bg-gray-100');
      expect(screen.queryByTestId('pulse-animation')).not.toBeInTheDocument();

      rerender(<RecordButton {...defaultProps} isRecording={true} />);

      button = screen.getByTestId('record-button');
      expect(button).toHaveClass('bg-red-500');
      expect(screen.getByTestId('pulse-animation')).toBeInTheDocument();
    });

    it('should change from recording to idle state correctly', () => {
      const { rerender } = render(<RecordButton {...defaultProps} isRecording={true} />);

      let button = screen.getByTestId('record-button');
      expect(button).toHaveClass('bg-red-500');
      expect(screen.getByTestId('pulse-animation')).toBeInTheDocument();

      rerender(<RecordButton {...defaultProps} isRecording={false} />);

      button = screen.getByTestId('record-button');
      expect(button).toHaveClass('bg-gray-100');
      expect(screen.queryByTestId('pulse-animation')).not.toBeInTheDocument();
    });

    it('should handle enable/disable transition correctly', () => {
      const { rerender } = render(<RecordButton {...defaultProps} isDisabled={false} />);

      let button = screen.getByTestId('record-button');
      expect(button).not.toBeDisabled();
      expect(button).toHaveClass('cursor-pointer');

      rerender(<RecordButton {...defaultProps} isDisabled={true} />);

      button = screen.getByTestId('record-button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('cursor-not-allowed');
    });
  });
});
