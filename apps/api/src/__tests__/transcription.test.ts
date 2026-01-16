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
