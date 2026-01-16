/**
 * Mock transcription service for development and testing
 */

import type {
  TranscriptionService,
  TranscriptionResult,
  TranscriptionWord,
} from './types';

/**
 * Predefined mock transcription text (Italian, decision-related content)
 */
const MOCK_TRANSCRIPT_TEXT = `Sto valutando se cambiare lavoro o restare nella mia posizione attuale.
Da un lato, il nuovo lavoro offre uno stipendio più alto e opportunità di crescita,
ma dovrei trasferirmi in un'altra città. Dall'altro lato, qui ho stabilità e sono vicino alla famiglia.
Mi sento un po' ansioso riguardo a questa decisione perché entrambe le opzioni hanno vantaggi e svantaggi significativi.`;

/**
 * Generate mock words from text with simulated timing and confidence
 */
function generateMockWords(text: string): TranscriptionWord[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  let currentTime = 0;
  const avgWordDuration = 350; // Average word duration in ms

  return words.map((word) => {
    const start = currentTime;
    const duration = avgWordDuration + Math.random() * 200 - 100; // 250-450ms per word
    currentTime += duration;

    return {
      text: word,
      start: Math.round(start),
      end: Math.round(currentTime),
      confidence: 0.85 + Math.random() * 0.15, // 0.85-1.0 confidence
    };
  });
}

/**
 * Sleep utility for simulating async delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock implementation of TranscriptionService
 * Returns predefined text after a simulated delay
 */
export class MockTranscriptionService implements TranscriptionService {
  private readonly delayMs: number;
  private readonly mockText: string;

  /**
   * Create a new MockTranscriptionService
   * @param options - Configuration options
   * @param options.delayMs - Delay in ms to simulate processing (default: 2000-3000ms random)
   * @param options.mockText - Custom mock text (default: predefined Italian decision text)
   */
  constructor(options?: { delayMs?: number; mockText?: string }) {
    this.delayMs = options?.delayMs ?? 2000 + Math.random() * 1000; // 2-3 seconds
    this.mockText = options?.mockText ?? MOCK_TRANSCRIPT_TEXT;
  }

  /**
   * Transcribe audio from a URL (mock implementation)
   * Returns predefined text after a simulated delay
   * @param audioUrl - URL to the audio file (ignored in mock)
   * @returns TranscriptionResult with mock data
   */
  async transcribe(_audioUrl: string): Promise<TranscriptionResult> {
    // Simulate processing delay
    await sleep(this.delayMs);

    // Clean up the mock text (remove extra whitespace)
    const cleanText = this.mockText.replace(/\s+/g, ' ').trim();

    // Generate mock words with timing
    const words = generateMockWords(cleanText);

    // Calculate overall confidence as average of word confidences
    const overallConfidence =
      words.length > 0
        ? words.reduce((sum, w) => sum + w.confidence, 0) / words.length
        : 0.95;

    return {
      text: cleanText,
      confidence: overallConfidence,
      words,
    };
  }
}

/**
 * Default mock transcript text exported for testing
 */
export const DEFAULT_MOCK_TEXT = MOCK_TRANSCRIPT_TEXT;
