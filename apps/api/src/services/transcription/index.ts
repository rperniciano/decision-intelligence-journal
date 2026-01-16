/**
 * Transcription service module
 *
 * Provides an interface for transcribing audio files.
 * Uses MockTranscriptionService in development/test or when ASSEMBLYAI_API_KEY is not set.
 * Uses AssemblyAITranscriptionService in production when ASSEMBLYAI_API_KEY is configured.
 */

export type {
  TranscriptionService,
  TranscriptionResult,
  TranscriptionWord,
} from './types';

export { MockTranscriptionService, DEFAULT_MOCK_TEXT } from './mock';
export {
  AssemblyAITranscriptionService,
  AssemblyAITranscriptionError,
  type AssemblyAITranscriptionServiceOptions,
} from './assemblyai';

import type { TranscriptionService } from './types';
import { MockTranscriptionService } from './mock';
import { AssemblyAITranscriptionService } from './assemblyai';

/**
 * Singleton instance of the transcription service
 */
let _transcriptionService: TranscriptionService | null = null;

/**
 * Get or create the transcription service instance.
 *
 * Returns MockTranscriptionService in development/test or when ASSEMBLYAI_API_KEY is not set.
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
    // 2. Running in test mode (unit tests should not hit real API)
    const useMock = !assemblyAiKey || nodeEnv === 'test';

    if (useMock) {
      _transcriptionService = new MockTranscriptionService();
    } else {
      // Use real AssemblyAI service in production/development with API key
      _transcriptionService = new AssemblyAITranscriptionService({
        apiKey: assemblyAiKey,
        languageCode: 'it', // Italian language support
        pollingTimeout: 300000, // 5 minutes max
        pollingInterval: 3000, // Poll every 3 seconds
        maxRetries: 3, // Retry up to 3 times on transient errors
      });
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
