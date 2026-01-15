/**
 * Unit tests for useUploadAudio hook
 *
 * @see US-041 in PRD
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUploadAudio } from '../hooks/useUploadAudio';
import * as audioService from '../services/audio';
import { AudioUploadError } from '../services/audio';

// Mock the auth context
const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer' as const,
  user: {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  },
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    session: mockSession,
    user: mockSession.user,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(),
  })),
}));

// Mock the audio service
vi.mock('../services/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/audio')>();
  return {
    ...actual,
    uploadAudio: vi.fn(),
  };
});

describe('useUploadAudio', () => {
  const mockUploadAudio = vi.mocked(audioService.uploadAudio);
  const mockUploadResponse = {
    url: 'https://storage.example.com/audio/123.webm',
    path: 'user-id/123.webm',
    size: 12345,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initial state', () => {
    it('should have idle state initially', () => {
      const { result } = renderHook(() => useUploadAudio());

      expect(result.current.state).toBe('idle');
      expect(result.current.isUploading).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBeNull();
    });
  });

  describe('upload function', () => {
    it('should set uploading state when upload starts', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });

      // Make upload hang
      mockUploadAudio.mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useUploadAudio());

      act(() => {
        result.current.upload(blob);
      });

      await waitFor(() => {
        expect(result.current.state).toBe('uploading');
        expect(result.current.isUploading).toBe(true);
        expect(result.current.progress).toBe(0);
      });
    });

    it('should set success state on successful upload', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUploadAudio.mockResolvedValueOnce(mockUploadResponse);

      const { result } = renderHook(() => useUploadAudio());

      await act(async () => {
        await result.current.upload(blob);
      });

      expect(result.current.state).toBe('success');
      expect(result.current.isUploading).toBe(false);
      expect(result.current.result).toEqual(mockUploadResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBe(100);
    });

    it('should return upload response on success', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUploadAudio.mockResolvedValueOnce(mockUploadResponse);

      const { result } = renderHook(() => useUploadAudio());

      let response;
      await act(async () => {
        response = await result.current.upload(blob);
      });

      expect(response).toEqual(mockUploadResponse);
    });

    it('should set error state on upload failure', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      const uploadError = new AudioUploadError('network_error', 'Network failure');
      mockUploadAudio.mockRejectedValueOnce(uploadError);

      const { result } = renderHook(() => useUploadAudio());

      await act(async () => {
        try {
          await result.current.upload(blob);
        } catch {
          // Expected error
        }
      });

      expect(result.current.state).toBe('error');
      expect(result.current.isUploading).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBe('Errore di connessione. Riprova.');
      expect(result.current.progress).toBeNull();
    });

    it('should throw error on failure', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      const uploadError = new AudioUploadError('server_error', 'Server error');
      mockUploadAudio.mockRejectedValueOnce(uploadError);

      const { result } = renderHook(() => useUploadAudio());

      await expect(
        act(async () => {
          await result.current.upload(blob);
        })
      ).rejects.toThrow(AudioUploadError);
    });

    it('should pass access token to uploadAudio', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUploadAudio.mockResolvedValueOnce(mockUploadResponse);

      const { result } = renderHook(() => useUploadAudio());

      await act(async () => {
        await result.current.upload(blob);
      });

      expect(mockUploadAudio).toHaveBeenCalledWith(blob, 'mock-access-token');
    });

    it('should handle unknown errors as server_error', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUploadAudio.mockRejectedValueOnce(new Error('Unknown error'));

      const { result } = renderHook(() => useUploadAudio());

      await act(async () => {
        try {
          await result.current.upload(blob);
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Errore del server. Riprova più tardi.');
    });
  });

  describe('reset function', () => {
    it('should reset state to idle', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUploadAudio.mockResolvedValueOnce(mockUploadResponse);

      const { result } = renderHook(() => useUploadAudio());

      await act(async () => {
        await result.current.upload(blob);
      });

      expect(result.current.state).toBe('success');

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBeNull();
    });

    it('should reset after error', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUploadAudio.mockRejectedValueOnce(new AudioUploadError('network_error', 'Error'));

      const { result } = renderHook(() => useUploadAudio());

      await act(async () => {
        try {
          await result.current.upload(blob);
        } catch {
          // Expected error
        }
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.error).toBeNull();
    });
  });

  describe('unauthorized session', () => {
    it('should throw unauthorized error when no session', async () => {
      // Mock useAuth to return no session
      const authMock = await import('../contexts/AuthContext');
      vi.mocked(authMock.useAuth).mockReturnValueOnce({
        session: null,
        user: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        signInWithGoogle: vi.fn(),
      });

      const blob = new Blob(['audio data'], { type: 'audio/webm' });

      const { result } = renderHook(() => useUploadAudio());

      await act(async () => {
        try {
          await result.current.upload(blob);
        } catch {
          // Expected error
        }
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).toBe("Sessione scaduta. Effettua nuovamente l'accesso.");
    });
  });

  describe('multiple uploads', () => {
    it('should clear previous state when starting new upload', async () => {
      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      mockUploadAudio.mockRejectedValueOnce(new AudioUploadError('network_error', 'Error'));
      mockUploadAudio.mockResolvedValueOnce(mockUploadResponse);

      const { result } = renderHook(() => useUploadAudio());

      // First upload fails
      await act(async () => {
        try {
          await result.current.upload(blob);
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).not.toBeNull();

      // Second upload succeeds
      await act(async () => {
        await result.current.upload(blob);
      });

      expect(result.current.state).toBe('success');
      expect(result.current.error).toBeNull();
      expect(result.current.result).toEqual(mockUploadResponse);
    });
  });
});
