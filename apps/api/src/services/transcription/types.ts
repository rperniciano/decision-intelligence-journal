/**
 * Types for the transcription service
 */

/**
 * A word from the transcription with timing information
 */
export interface TranscriptionWord {
  /** The transcribed word */
  text: string;
  /** Start time in milliseconds */
  start: number;
  /** End time in milliseconds */
  end: number;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Result of a transcription operation
 */
export interface TranscriptionResult {
  /** The full transcribed text */
  text: string;
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Individual words with timing and confidence */
  words: TranscriptionWord[];
}

/**
 * Interface for transcription service implementations
 */
export interface TranscriptionService {
  /**
   * Transcribe audio from a URL
   * @param audioUrl - URL to the audio file
   * @returns TranscriptionResult with text, confidence, and words
   */
  transcribe(audioUrl: string): Promise<TranscriptionResult>;
}
