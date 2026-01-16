/**
 * Unit tests for audio service
 *
 * @see US-041 in PRD
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  uploadAudio,
  AudioUploadError,
  getUploadErrorMessage,
  AUDIO_UPLOAD_ERROR_MESSAGES,
} from '../services/audio';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('audioService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('uploadAudio', () => {
    const mockAccessToken = 'mock-access-token';
    const mockResponse = {
      url: 'https://storage.example.com/audio/123.webm',
      path: 'user-id/123.webm',
      size: 12345,
    };

    describe('successful upload', () => {
      it('should upload audio blob and return response', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/webm' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await uploadAudio(blob, mockAccessToken);

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/audio/upload'),
          expect.objectContaining({
            method: 'POST',
            headers: {
              Authorization: `Bearer ${mockAccessToken}`,
            },
          })
        );
      });

      it('should include correct filename based on MIME type', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/webm' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await uploadAudio(blob, mockAccessToken);

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs).toBeDefined();
        const formData = callArgs![1].body as FormData;
        const file = formData.get('audio') as File;
        expect(file.name).toBe('recording.webm');
      });

      it('should handle mp4 audio type', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/mp4' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await uploadAudio(blob, mockAccessToken);

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs).toBeDefined();
        const formData = callArgs![1].body as FormData;
        const file = formData.get('audio') as File;
        expect(file.name).toBe('recording.m4a');
      });

      it('should handle mpeg audio type', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/mpeg' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await uploadAudio(blob, mockAccessToken);

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs).toBeDefined();
        const formData = callArgs![1].body as FormData;
        const file = formData.get('audio') as File;
        expect(file.name).toBe('recording.mp3');
      });

      it('should handle wav audio type', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/wav' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        await uploadAudio(blob, mockAccessToken);

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs).toBeDefined();
        const formData = callArgs![1].body as FormData;
        const file = formData.get('audio') as File;
        expect(file.name).toBe('recording.wav');
      });
    });

    describe('validation errors', () => {
      it('should throw no_file error when blob is null', async () => {
        await expect(uploadAudio(null as unknown as Blob, mockAccessToken)).rejects.toThrow(
          AudioUploadError
        );

        try {
          await uploadAudio(null as unknown as Blob, mockAccessToken);
        } catch (err) {
          expect(err).toBeInstanceOf(AudioUploadError);
          expect((err as AudioUploadError).type).toBe('no_file');
        }
      });

      it('should throw no_file error when blob is empty', async () => {
        const emptyBlob = new Blob([], { type: 'audio/webm' });
        // Mock size to be 0
        Object.defineProperty(emptyBlob, 'size', { value: 0 });

        await expect(uploadAudio(emptyBlob, mockAccessToken)).rejects.toThrow(AudioUploadError);
      });

      it('should throw file_too_large error when blob exceeds 10MB', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/webm' });
        // Mock size to exceed 10MB
        Object.defineProperty(blob, 'size', { value: 11 * 1024 * 1024 });

        try {
          await uploadAudio(blob, mockAccessToken);
        } catch (err) {
          expect(err).toBeInstanceOf(AudioUploadError);
          expect((err as AudioUploadError).type).toBe('file_too_large');
        }
      });

      it('should throw invalid_type error for non-audio blob', async () => {
        const blob = new Blob(['text data'], { type: 'text/plain' });

        try {
          await uploadAudio(blob, mockAccessToken);
        } catch (err) {
          expect(err).toBeInstanceOf(AudioUploadError);
          expect((err as AudioUploadError).type).toBe('invalid_type');
        }
      });

      it('should accept audio/x-wav type', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/x-wav' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await uploadAudio(blob, mockAccessToken);
        expect(result).toEqual(mockResponse);
      });

      it('should accept audio/wave type', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/wave' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const result = await uploadAudio(blob, mockAccessToken);
        expect(result).toEqual(mockResponse);
      });
    });

    describe('HTTP errors', () => {
      it('should throw unauthorized error on 401 response', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/webm' });
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
        });

        try {
          await uploadAudio(blob, mockAccessToken);
        } catch (err) {
          expect(err).toBeInstanceOf(AudioUploadError);
          expect((err as AudioUploadError).type).toBe('unauthorized');
        }
      });

      it('should throw file_too_large error on 413 response', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/webm' });
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 413,
        });

        try {
          await uploadAudio(blob, mockAccessToken);
        } catch (err) {
          expect(err).toBeInstanceOf(AudioUploadError);
          expect((err as AudioUploadError).type).toBe('file_too_large');
        }
      });

      it('should throw invalid_type error on 415 response', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/webm' });
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 415,
        });

        try {
          await uploadAudio(blob, mockAccessToken);
        } catch (err) {
          expect(err).toBeInstanceOf(AudioUploadError);
          expect((err as AudioUploadError).type).toBe('invalid_type');
        }
      });

      it('should throw server_error on 500 response', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/webm' });
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        try {
          await uploadAudio(blob, mockAccessToken);
        } catch (err) {
          expect(err).toBeInstanceOf(AudioUploadError);
          expect((err as AudioUploadError).type).toBe('server_error');
        }
      });
    });

    describe('network errors', () => {
      it('should throw network_error when fetch throws', async () => {
        const blob = new Blob(['audio data'], { type: 'audio/webm' });
        mockFetch.mockRejectedValueOnce(new Error('Network failure'));

        try {
          await uploadAudio(blob, mockAccessToken);
        } catch (err) {
          expect(err).toBeInstanceOf(AudioUploadError);
          expect((err as AudioUploadError).type).toBe('network_error');
        }
      });
    });
  });

  describe('AudioUploadError', () => {
    it('should have correct name and type', () => {
      const error = new AudioUploadError('network_error', 'Test message');
      expect(error.name).toBe('AudioUploadError');
      expect(error.type).toBe('network_error');
      expect(error.message).toBe('Test message');
    });
  });

  describe('getUploadErrorMessage', () => {
    it('should return Italian error message for each error type', () => {
      const types: Array<keyof typeof AUDIO_UPLOAD_ERROR_MESSAGES> = [
        'no_file',
        'file_too_large',
        'invalid_type',
        'network_error',
        'server_error',
        'unauthorized',
      ];

      types.forEach((type) => {
        const error = new AudioUploadError(type, 'test');
        const message = getUploadErrorMessage(error);
        expect(message).toBe(AUDIO_UPLOAD_ERROR_MESSAGES[type]);
      });
    });
  });

  describe('AUDIO_UPLOAD_ERROR_MESSAGES', () => {
    it('should have Italian messages for all error types', () => {
      expect(AUDIO_UPLOAD_ERROR_MESSAGES.no_file).toBe('Nessun file audio selezionato');
      expect(AUDIO_UPLOAD_ERROR_MESSAGES.file_too_large).toBe(
        'Il file audio è troppo grande (massimo 10MB)'
      );
      expect(AUDIO_UPLOAD_ERROR_MESSAGES.invalid_type).toBe('Formato audio non supportato');
      expect(AUDIO_UPLOAD_ERROR_MESSAGES.network_error).toBe('Errore di connessione. Riprova.');
      expect(AUDIO_UPLOAD_ERROR_MESSAGES.server_error).toBe('Errore del server. Riprova più tardi.');
      expect(AUDIO_UPLOAD_ERROR_MESSAGES.unauthorized).toBe(
        "Sessione scaduta. Effettua nuovamente l'accesso."
      );
    });
  });
});
