/**
 * Assembly.AI transcription service implementation
 *
 * Implements the TranscriptionService interface using Assembly.AI's API
 * with retry logic, timeout handling, and proper error mapping.
 */

import { AssemblyAI, Transcript, TranscriptWord } from 'assemblyai';
import type { TranscriptionService, TranscriptionResult, TranscriptionWord as AppWord } from './types';

/**
 * Error class for Assembly.AI transcription errors
 */
export class AssemblyAITranscriptionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AssemblyAITranscriptionError';
  }
}

/**
 * Configuration options for AssemblyAITranscriptionService
 */
export interface AssemblyAITranscriptionServiceOptions {
  /** Assembly.AI API key */
  apiKey: string;
  /** Language code for transcription (default: 'it' for Italian) */
  languageCode?: string;
  /** Maximum timeout for polling in milliseconds (default: 300000 = 5 minutes) */
  pollingTimeout?: number;
  /** Polling interval in milliseconds (default: 3000 = 3 seconds) */
  pollingInterval?: number;
  /** Maximum number of retries on transient errors (default: 3) */
  maxRetries?: number;
  /** Base delay for exponential backoff in milliseconds (default: 1000) */
  retryBaseDelayMs?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_OPTIONS: Required<Omit<AssemblyAITranscriptionServiceOptions, 'apiKey'>> = {
  languageCode: 'it',
  pollingTimeout: 300000, // 5 minutes
  pollingInterval: 3000, // 3 seconds
  maxRetries: 3,
  retryBaseDelayMs: 1000,
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable (transient network/API errors)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Retry on network errors, rate limits, and server errors
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('enotfound') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }
  return false;
}

/**
 * Map Assembly.AI word to our TranscriptionWord type
 */
function mapWord(word: TranscriptWord): AppWord {
  return {
    text: word.text,
    start: word.start,
    end: word.end,
    confidence: word.confidence,
  };
}

/**
 * Calculate overall confidence from words
 */
function calculateOverallConfidence(words: AppWord[]): number {
  if (words.length === 0) {
    return 0.95; // Default confidence when no words
  }
  const sum = words.reduce((acc, word) => acc + word.confidence, 0);
  return sum / words.length;
}

/**
 * Assembly.AI transcription service implementation
 *
 * Provides transcription using Assembly.AI's API with:
 * - Automatic polling until completion
 * - Configurable timeout (default 5 minutes)
 * - Retry logic with exponential backoff (max 3 retries)
 * - Italian language support by default
 */
export class AssemblyAITranscriptionService implements TranscriptionService {
  private readonly client: AssemblyAI;
  private readonly options: Required<Omit<AssemblyAITranscriptionServiceOptions, 'apiKey'>>;

  constructor(options: AssemblyAITranscriptionServiceOptions) {
    this.client = new AssemblyAI({ apiKey: options.apiKey });
    this.options = {
      languageCode: options.languageCode ?? DEFAULT_OPTIONS.languageCode,
      pollingTimeout: options.pollingTimeout ?? DEFAULT_OPTIONS.pollingTimeout,
      pollingInterval: options.pollingInterval ?? DEFAULT_OPTIONS.pollingInterval,
      maxRetries: options.maxRetries ?? DEFAULT_OPTIONS.maxRetries,
      retryBaseDelayMs: options.retryBaseDelayMs ?? DEFAULT_OPTIONS.retryBaseDelayMs,
    };
  }

  /**
   * Transcribe audio from a URL
   *
   * Flow:
   * 1. Submit transcription job to Assembly.AI
   * 2. Poll for completion with configured timeout
   * 3. Map response to TranscriptionResult
   *
   * @param audioUrl - URL to the audio file
   * @returns TranscriptionResult with text, confidence, and words
   * @throws AssemblyAITranscriptionError on failure
   */
  async transcribe(audioUrl: string): Promise<TranscriptionResult> {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < this.options.maxRetries) {
      attempt++;

      try {
        const result = await this.transcribeAttempt(audioUrl);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on non-retryable errors
        if (!isRetryableError(error)) {
          throw this.wrapError(lastError);
        }

        // Last attempt, don't sleep
        if (attempt >= this.options.maxRetries) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s, etc.
        const delayMs = this.options.retryBaseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delayMs);
      }
    }

    // All retries exhausted
    throw this.wrapError(lastError ?? new Error('Transcription failed after all retries'));
  }

  /**
   * Single transcription attempt
   */
  private async transcribeAttempt(audioUrl: string): Promise<TranscriptionResult> {
    // Submit transcription job
    const transcript = await this.submitAndWait(audioUrl);

    // Check for errors
    if (transcript.status === 'error') {
      throw new AssemblyAITranscriptionError(
        transcript.error || 'Transcription failed with unknown error',
        'TRANSCRIPTION_ERROR',
        false
      );
    }

    // Map response to our format
    return this.mapTranscriptResult(transcript);
  }

  /**
   * Submit transcription and wait for completion
   */
  private async submitAndWait(audioUrl: string): Promise<Transcript> {
    // Use the SDK's built-in transcribe method which handles polling
    // We configure polling via parameters
    const transcript = await this.client.transcripts.transcribe(
      {
        audio_url: audioUrl,
        language_code: this.options.languageCode,
      },
      {
        pollingInterval: this.options.pollingInterval,
        pollingTimeout: this.options.pollingTimeout,
      }
    );

    return transcript;
  }

  /**
   * Map Assembly.AI transcript to our TranscriptionResult
   */
  private mapTranscriptResult(transcript: Transcript): TranscriptionResult {
    // Map words, filtering out any null/undefined
    const words: AppWord[] = (transcript.words ?? [])
      .filter((w): w is TranscriptWord => w !== null && w !== undefined)
      .map(mapWord);

    // Calculate overall confidence
    const confidence = calculateOverallConfidence(words);

    return {
      text: transcript.text ?? '',
      confidence,
      words,
    };
  }

  /**
   * Wrap errors in our custom error type
   */
  private wrapError(error: Error): AssemblyAITranscriptionError {
    if (error instanceof AssemblyAITranscriptionError) {
      return error;
    }

    const message = error.message;
    let code = 'UNKNOWN_ERROR';
    let retryable = false;

    if (message.includes('timeout') || message.includes('Timeout')) {
      code = 'TIMEOUT_ERROR';
      retryable = true;
    } else if (message.includes('network') || message.includes('ECONNRESET')) {
      code = 'NETWORK_ERROR';
      retryable = true;
    } else if (message.includes('rate limit') || message.includes('429')) {
      code = 'RATE_LIMIT_ERROR';
      retryable = true;
    } else if (message.includes('401') || message.includes('Unauthorized')) {
      code = 'AUTH_ERROR';
    } else if (message.includes('400') || message.includes('Bad Request')) {
      code = 'INVALID_REQUEST_ERROR';
    }

    return new AssemblyAITranscriptionError(message, code, retryable);
  }
}
