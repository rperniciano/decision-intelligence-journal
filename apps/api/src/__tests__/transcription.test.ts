import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  MockTranscriptionService,
  DEFAULT_MOCK_TEXT,
  getTranscriptionService,
  resetTranscriptionService,
} from '../services/transcription';

describe('MockTranscriptionService', () => {
  describe('transcribe', () => {
    it('should return TranscriptionResult with text, confidence, and words', async () => {
      const service = new MockTranscriptionService({ delayMs: 0 });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('words');
      expect(typeof result.text).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.words)).toBe(true);
    });

    it('should return predefined mock text by default', async () => {
      const service = new MockTranscriptionService({ delayMs: 0 });
      const result = await service.transcribe('https://example.com/audio.webm');

      // Text should contain key phrases from the default mock
      expect(result.text).toContain('cambiare lavoro');
      expect(result.text).toContain('posizione attuale');
    });

    it('should return custom mock text when provided', async () => {
      const customText = 'Questo è un testo personalizzato per il test.';
      const service = new MockTranscriptionService({ delayMs: 0, mockText: customText });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.text).toBe(customText);
    });

    it('should clean up whitespace in text', async () => {
      const messyText = 'Testo   con    spazi   multipli\n\nnewline';
      const service = new MockTranscriptionService({ delayMs: 0, mockText: messyText });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.text).toBe('Testo con spazi multipli newline');
      expect(result.text).not.toContain('  ');
    });

    it('should return confidence between 0 and 1', async () => {
      const service = new MockTranscriptionService({ delayMs: 0 });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should return words array with correct structure', async () => {
      const service = new MockTranscriptionService({ delayMs: 0 });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.words.length).toBeGreaterThan(0);

      const firstWord = result.words[0];
      expect(firstWord).toHaveProperty('text');
      expect(firstWord).toHaveProperty('start');
      expect(firstWord).toHaveProperty('end');
      expect(firstWord).toHaveProperty('confidence');
    });

    it('should have words with valid timing (start < end)', async () => {
      const service = new MockTranscriptionService({ delayMs: 0 });
      const result = await service.transcribe('https://example.com/audio.webm');

      result.words.forEach((word) => {
        expect(word.start).toBeLessThan(word.end);
        expect(word.start).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have words in sequential order (non-overlapping)', async () => {
      const service = new MockTranscriptionService({ delayMs: 0 });
      const result = await service.transcribe('https://example.com/audio.webm');

      for (let i = 1; i < result.words.length; i++) {
        const prev = result.words[i - 1]!;
        const curr = result.words[i]!;
        expect(curr.start).toBeGreaterThanOrEqual(prev.end - 1); // Allow small overlap tolerance
      }
    });

    it('should have word confidences between 0.85 and 1', async () => {
      const service = new MockTranscriptionService({ delayMs: 0 });
      const result = await service.transcribe('https://example.com/audio.webm');

      result.words.forEach((word) => {
        expect(word.confidence).toBeGreaterThanOrEqual(0.85);
        expect(word.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should simulate delay when configured', async () => {
      const delayMs = 100;
      const service = new MockTranscriptionService({ delayMs });

      const startTime = Date.now();
      await service.transcribe('https://example.com/audio.webm');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(delayMs - 10); // Allow 10ms tolerance
    });

    it('should ignore audioUrl parameter (mock behavior)', async () => {
      const service = new MockTranscriptionService({ delayMs: 0 });

      const result1 = await service.transcribe('https://example.com/audio1.webm');
      const result2 = await service.transcribe('https://example.com/audio2.mp3');

      // Both should return the same mock text
      expect(result1.text).toBe(result2.text);
    });
  });

  describe('DEFAULT_MOCK_TEXT', () => {
    it('should be a non-empty string', () => {
      expect(typeof DEFAULT_MOCK_TEXT).toBe('string');
      expect(DEFAULT_MOCK_TEXT.length).toBeGreaterThan(0);
    });

    it('should contain Italian text about a decision', () => {
      expect(DEFAULT_MOCK_TEXT).toContain('decisione');
    });
  });
});

describe('getTranscriptionService', () => {
  beforeEach(() => {
    resetTranscriptionService();
  });

  afterEach(() => {
    resetTranscriptionService();
    vi.unstubAllEnvs();
  });

  it('should return a TranscriptionService instance', () => {
    const service = getTranscriptionService();

    expect(service).toBeDefined();
    expect(typeof service.transcribe).toBe('function');
  });

  it('should return the same instance on multiple calls (singleton)', () => {
    const service1 = getTranscriptionService();
    const service2 = getTranscriptionService();

    expect(service1).toBe(service2);
  });

  it('should return MockTranscriptionService in test environment', () => {
    vi.stubEnv('NODE_ENV', 'test');
    resetTranscriptionService();

    const service = getTranscriptionService();

    expect(service).toBeInstanceOf(MockTranscriptionService);
  });

  it('should return MockTranscriptionService in development environment', () => {
    vi.stubEnv('NODE_ENV', 'development');
    resetTranscriptionService();

    const service = getTranscriptionService();

    expect(service).toBeInstanceOf(MockTranscriptionService);
  });

  it('should return MockTranscriptionService when ASSEMBLYAI_API_KEY is not set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ASSEMBLYAI_API_KEY', '');
    resetTranscriptionService();

    const service = getTranscriptionService();

    expect(service).toBeInstanceOf(MockTranscriptionService);
  });

  it('should return new instance after reset', () => {
    const service1 = getTranscriptionService();
    resetTranscriptionService();
    const service2 = getTranscriptionService();

    expect(service1).not.toBe(service2);
  });
});

describe('resetTranscriptionService', () => {
  it('should reset the singleton instance', () => {
    const service1 = getTranscriptionService();
    resetTranscriptionService();
    const service2 = getTranscriptionService();

    expect(service1).not.toBe(service2);
  });
});

// Hoisted mock setup for assemblyai module (needed for vi.mock hoisting)
const { mockTranscribe, MockAssemblyAI } = vi.hoisted(() => {
  const mockTranscribe = vi.fn();
  const MockAssemblyAI = vi.fn().mockImplementation(function () {
    return {
      transcripts: {
        transcribe: mockTranscribe,
      },
    };
  });
  return { mockTranscribe, MockAssemblyAI };
});

// Mock the assemblyai module with the hoisted mock
vi.mock('assemblyai', () => ({
  AssemblyAI: MockAssemblyAI,
}));

import { AssemblyAI } from 'assemblyai';
import {
  AssemblyAITranscriptionService,
  AssemblyAITranscriptionError,
} from '../services/transcription';

describe('AssemblyAITranscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTranscribe.mockReset();
  });

  describe('constructor', () => {
    it('should create an AssemblyAI client with the provided API key', () => {
      new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });

      expect(AssemblyAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });

    it('should use default options when not provided', () => {
      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });

      // Just verify the service was created successfully
      expect(service).toBeDefined();
    });

    it('should accept custom options', () => {
      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        languageCode: 'en',
        pollingTimeout: 60000,
        pollingInterval: 1000,
        maxRetries: 5,
        retryBaseDelayMs: 500,
      });

      expect(service).toBeDefined();
    });
  });

  describe('transcribe', () => {
    it('should return TranscriptionResult on successful transcription', async () => {
      const mockResult = {
        status: 'completed',
        text: 'This is a test transcription.',
        words: [
          { text: 'This', start: 0, end: 100, confidence: 0.95 },
          { text: 'is', start: 100, end: 200, confidence: 0.98 },
          { text: 'a', start: 200, end: 250, confidence: 0.99 },
          { text: 'test', start: 250, end: 400, confidence: 0.97 },
          { text: 'transcription.', start: 400, end: 600, confidence: 0.96 },
        ],
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result).toHaveProperty('text', 'This is a test transcription.');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('words');
      expect(result.words).toHaveLength(5);
    });

    it('should map words correctly to TranscriptionWord format', async () => {
      const mockResult = {
        status: 'completed',
        text: 'Test',
        words: [{ text: 'Test', start: 0, end: 100, confidence: 0.95 }],
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.words[0]).toEqual({
        text: 'Test',
        start: 0,
        end: 100,
        confidence: 0.95,
      });
    });

    it('should calculate overall confidence from word confidences', async () => {
      const mockResult = {
        status: 'completed',
        text: 'Two words',
        words: [
          { text: 'Two', start: 0, end: 100, confidence: 0.8 },
          { text: 'words', start: 100, end: 200, confidence: 1.0 },
        ],
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.confidence).toBe(0.9); // Average of 0.8 and 1.0
    });

    it('should return default confidence when no words', async () => {
      const mockResult = {
        status: 'completed',
        text: '',
        words: [],
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.confidence).toBe(0.95);
    });

    it('should handle null words array', async () => {
      const mockResult = {
        status: 'completed',
        text: 'No words array',
        words: null,
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.words).toEqual([]);
      expect(result.confidence).toBe(0.95);
    });

    it('should handle null text', async () => {
      const mockResult = {
        status: 'completed',
        text: null,
        words: [],
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.text).toBe('');
    });

    it('should pass correct parameters to AssemblyAI SDK', async () => {
      const mockResult = {
        status: 'completed',
        text: 'Test',
        words: [],
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        languageCode: 'en',
        pollingTimeout: 60000,
        pollingInterval: 1000,
      });
      await service.transcribe('https://example.com/audio.webm');

      expect(mockTranscribe).toHaveBeenCalledWith(
        {
          audio_url: 'https://example.com/audio.webm',
          language_code: 'en',
        },
        {
          pollingInterval: 1000,
          pollingTimeout: 60000,
        }
      );
    });

    it('should use Italian language by default', async () => {
      const mockResult = {
        status: 'completed',
        text: 'Test',
        words: [],
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });
      await service.transcribe('https://example.com/audio.webm');

      expect(mockTranscribe).toHaveBeenCalledWith(
        expect.objectContaining({ language_code: 'it' }),
        expect.any(Object)
      );
    });

    it('should throw AssemblyAITranscriptionError when status is error', async () => {
      const mockResult = {
        status: 'error',
        error: 'Audio file is too short',
        text: null,
        words: null,
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });

      await expect(service.transcribe('https://example.com/audio.webm')).rejects.toThrow(
        AssemblyAITranscriptionError
      );
    });

    it('should include error message in AssemblyAITranscriptionError', async () => {
      const mockResult = {
        status: 'error',
        error: 'Audio file is too short',
        text: null,
        words: null,
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });

      try {
        await service.transcribe('https://example.com/audio.webm');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AssemblyAITranscriptionError);
        expect((e as AssemblyAITranscriptionError).message).toBe('Audio file is too short');
        expect((e as AssemblyAITranscriptionError).code).toBe('TRANSCRIPTION_ERROR');
      }
    });

    it('should handle unknown error message', async () => {
      const mockResult = {
        status: 'error',
        error: null,
        text: null,
        words: null,
      };
      mockTranscribe.mockResolvedValue(mockResult);

      const service = new AssemblyAITranscriptionService({ apiKey: 'test-api-key' });

      try {
        await service.transcribe('https://example.com/audio.webm');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as AssemblyAITranscriptionError).message).toContain('unknown error');
      }
    });
  });

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      const mockResult = {
        status: 'completed',
        text: 'Success after retry',
        words: [],
      };

      mockTranscribe
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce(mockResult);

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        retryBaseDelayMs: 1, // Fast retries for testing
      });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.text).toBe('Success after retry');
      expect(mockTranscribe).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout errors', async () => {
      const mockResult = {
        status: 'completed',
        text: 'Success',
        words: [],
      };

      mockTranscribe
        .mockRejectedValueOnce(new Error('timeout exceeded'))
        .mockResolvedValueOnce(mockResult);

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        retryBaseDelayMs: 1,
      });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.text).toBe('Success');
      expect(mockTranscribe).toHaveBeenCalledTimes(2);
    });

    it('should retry on rate limit errors (429)', async () => {
      const mockResult = {
        status: 'completed',
        text: 'Success',
        words: [],
      };

      mockTranscribe
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValueOnce(mockResult);

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        retryBaseDelayMs: 1,
      });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.text).toBe('Success');
      expect(mockTranscribe).toHaveBeenCalledTimes(2);
    });

    it('should retry on server errors (500, 502, 503, 504)', async () => {
      const mockResult = {
        status: 'completed',
        text: 'Success',
        words: [],
      };

      mockTranscribe
        .mockRejectedValueOnce(new Error('500 Internal Server Error'))
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValueOnce(mockResult);

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        retryBaseDelayMs: 1,
      });
      const result = await service.transcribe('https://example.com/audio.webm');

      expect(result.text).toBe('Success');
      expect(mockTranscribe).toHaveBeenCalledTimes(3);
    });

    it('should NOT retry on authentication errors (401)', async () => {
      mockTranscribe.mockRejectedValue(new Error('401 Unauthorized'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        retryBaseDelayMs: 1,
      });

      await expect(service.transcribe('https://example.com/audio.webm')).rejects.toThrow(
        AssemblyAITranscriptionError
      );
      expect(mockTranscribe).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on bad request errors (400)', async () => {
      mockTranscribe.mockRejectedValue(new Error('400 Bad Request'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        retryBaseDelayMs: 1,
      });

      await expect(service.transcribe('https://example.com/audio.webm')).rejects.toThrow(
        AssemblyAITranscriptionError
      );
      expect(mockTranscribe).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw after max attempts', async () => {
      mockTranscribe.mockRejectedValue(new Error('network error'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        maxRetries: 3,
        retryBaseDelayMs: 1,
      });

      await expect(service.transcribe('https://example.com/audio.webm')).rejects.toThrow(
        AssemblyAITranscriptionError
      );
      expect(mockTranscribe).toHaveBeenCalledTimes(3);
    });

    it('should use custom maxRetries value', async () => {
      mockTranscribe.mockRejectedValue(new Error('network error'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        maxRetries: 5,
        retryBaseDelayMs: 1,
      });

      await expect(service.transcribe('https://example.com/audio.webm')).rejects.toThrow();
      expect(mockTranscribe).toHaveBeenCalledTimes(5);
    });
  });

  describe('error classification', () => {
    it('should classify timeout errors correctly', async () => {
      mockTranscribe.mockRejectedValue(new Error('Timeout exceeded'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        maxRetries: 1,
        retryBaseDelayMs: 1,
      });

      try {
        await service.transcribe('https://example.com/audio.webm');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as AssemblyAITranscriptionError).code).toBe('TIMEOUT_ERROR');
        expect((e as AssemblyAITranscriptionError).retryable).toBe(true);
      }
    });

    it('should classify network errors correctly', async () => {
      mockTranscribe.mockRejectedValue(new Error('ECONNRESET'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        maxRetries: 1,
        retryBaseDelayMs: 1,
      });

      try {
        await service.transcribe('https://example.com/audio.webm');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as AssemblyAITranscriptionError).code).toBe('NETWORK_ERROR');
        expect((e as AssemblyAITranscriptionError).retryable).toBe(true);
      }
    });

    it('should classify rate limit errors correctly', async () => {
      mockTranscribe.mockRejectedValue(new Error('rate limit exceeded'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        maxRetries: 1,
        retryBaseDelayMs: 1,
      });

      try {
        await service.transcribe('https://example.com/audio.webm');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as AssemblyAITranscriptionError).code).toBe('RATE_LIMIT_ERROR');
        expect((e as AssemblyAITranscriptionError).retryable).toBe(true);
      }
    });

    it('should classify auth errors correctly', async () => {
      mockTranscribe.mockRejectedValue(new Error('401 Unauthorized'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        maxRetries: 1,
        retryBaseDelayMs: 1,
      });

      try {
        await service.transcribe('https://example.com/audio.webm');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as AssemblyAITranscriptionError).code).toBe('AUTH_ERROR');
        expect((e as AssemblyAITranscriptionError).retryable).toBe(false);
      }
    });

    it('should classify invalid request errors correctly', async () => {
      mockTranscribe.mockRejectedValue(new Error('400 Bad Request'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        maxRetries: 1,
        retryBaseDelayMs: 1,
      });

      try {
        await service.transcribe('https://example.com/audio.webm');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as AssemblyAITranscriptionError).code).toBe('INVALID_REQUEST_ERROR');
        expect((e as AssemblyAITranscriptionError).retryable).toBe(false);
      }
    });

    it('should classify unknown errors correctly', async () => {
      mockTranscribe.mockRejectedValue(new Error('Some weird error'));

      const service = new AssemblyAITranscriptionService({
        apiKey: 'test-api-key',
        maxRetries: 1,
        retryBaseDelayMs: 1,
      });

      try {
        await service.transcribe('https://example.com/audio.webm');
        expect.fail('Should have thrown');
      } catch (e) {
        expect((e as AssemblyAITranscriptionError).code).toBe('UNKNOWN_ERROR');
        expect((e as AssemblyAITranscriptionError).retryable).toBe(false);
      }
    });
  });
});

describe('AssemblyAITranscriptionError', () => {
  it('should create error with message, code, and retryable flag', () => {
    const error = new AssemblyAITranscriptionError('Test error', 'TEST_CODE', true);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('AssemblyAITranscriptionError');
  });

  it('should default retryable to false', () => {
    const error = new AssemblyAITranscriptionError('Test error', 'TEST_CODE');

    expect(error.retryable).toBe(false);
  });

  it('should be instanceof Error', () => {
    const error = new AssemblyAITranscriptionError('Test', 'CODE');

    expect(error).toBeInstanceOf(Error);
  });
});

describe('getTranscriptionService (AssemblyAI integration)', () => {
  beforeEach(() => {
    resetTranscriptionService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetTranscriptionService();
    vi.unstubAllEnvs();
  });

  it('should return AssemblyAITranscriptionService in production with API key', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ASSEMBLYAI_API_KEY', 'test-api-key');
    resetTranscriptionService();

    const service = getTranscriptionService();

    expect(service).toBeInstanceOf(AssemblyAITranscriptionService);
  });

  it('should return AssemblyAITranscriptionService in development with API key', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ASSEMBLYAI_API_KEY', 'test-api-key');
    resetTranscriptionService();

    const service = getTranscriptionService();

    // In development with API key, should use real service
    expect(service).toBeInstanceOf(AssemblyAITranscriptionService);
  });

  it('should return MockTranscriptionService in test environment even with API key', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ASSEMBLYAI_API_KEY', 'test-api-key');
    resetTranscriptionService();

    const service = getTranscriptionService();

    expect(service).toBeInstanceOf(MockTranscriptionService);
  });
});
