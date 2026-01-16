/**
 * Transcription service module
 *
 * Provides an interface for transcribing audio files.
 * Uses MockTranscriptionService in development or when ASSEMBLYAI_API_KEY is not set.
 * Uses AssemblyAITranscriptionService in production (when implemented).
 */

export type {
  TranscriptionService,
  TranscriptionResult,
  TranscriptionWord,
} from './types';

export { MockTranscriptionService, DEFAULT_MOCK_TEXT } from './mock';

import type { TranscriptionService } from './types';
import { MockTranscriptionService } from './mock';

/**
 * Singleton instance of the transcription service
 */
let _transcriptionService: TranscriptionService | null = null;

/**
 * Get or create the transcription service instance.
 *
 * Returns MockTranscriptionService in development or when ASSEMBLYAI_API_KEY is not set.
 * Returns AssemblyAITranscriptionService in production when ASSEMBLYAI_API_KEY is configured.
 *
 * @returns TranscriptionService instance
 */
export function getTranscriptionService(): TranscriptionService {
  if (!_transcriptionService) {
    const assemblyAiKey = process.env.ASSEMBLYAI_API_KEY;
    const nodeEnv = process.env.NODE_ENV || 'development';

    // Use mock service if:
    // 1. No API key is set, OR
    // 2. Running in development/test mode
    const useMock = !assemblyAiKey || nodeEnv === 'test' || nodeEnv === 'development';

    if (useMock) {
      _transcriptionService = new MockTranscriptionService();
    } else {
      // Real AssemblyAI service will be implemented in US-044
      // For now, fall back to mock
      _transcriptionService = new MockTranscriptionService();
    }
  }

  return _transcriptionService;
}

/**
 * Reset the transcription service instance.
 * Useful for testing to ensure fresh state.
 */
export function resetTranscriptionService(): void {
  _transcriptionService = null;
}
