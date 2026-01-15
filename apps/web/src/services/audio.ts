/**
 * Audio service for uploading audio files to the backend
 *
 * @see US-041 in PRD
 */

import type { AudioUploadResponse } from '@decisions/types';

/**
 * Configuration for the audio service
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Error types for audio upload
 */
export type AudioUploadErrorType =
  | 'no_file'
  | 'file_too_large'
  | 'invalid_type'
  | 'network_error'
  | 'server_error'
  | 'unauthorized';

/**
 * Custom error class for audio upload errors
 */
export class AudioUploadError extends Error {
  constructor(
    public type: AudioUploadErrorType,
    message: string
  ) {
    super(message);
    this.name = 'AudioUploadError';
  }
}

/**
 * Italian error messages for user-friendly display
 */
export const AUDIO_UPLOAD_ERROR_MESSAGES: Record<AudioUploadErrorType, string> = {
  no_file: 'Nessun file audio selezionato',
  file_too_large: 'Il file audio è troppo grande (massimo 10MB)',
  invalid_type: 'Formato audio non supportato',
  network_error: 'Errore di connessione. Riprova.',
  server_error: 'Errore del server. Riprova più tardi.',
  unauthorized: 'Sessione scaduta. Effettua nuovamente l\'accesso.',
};

/**
 * Get user-friendly error message from AudioUploadError
 */
export function getUploadErrorMessage(error: AudioUploadError): string {
  return AUDIO_UPLOAD_ERROR_MESSAGES[error.type] || 'Errore durante il caricamento';
}

/**
 * Upload audio blob to the backend
 *
 * @param blob - The audio blob to upload
 * @param accessToken - JWT access token for authentication
 * @returns Promise with upload response (url, path, size)
 * @throws AudioUploadError on failure
 */
export async function uploadAudio(
  blob: Blob,
  accessToken: string
): Promise<AudioUploadResponse> {
  // Validate blob
  if (!blob || blob.size === 0) {
    throw new AudioUploadError('no_file', 'No audio file provided');
  }

  // Check file size (10MB limit)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (blob.size > MAX_SIZE) {
    throw new AudioUploadError('file_too_large', `File size ${blob.size} exceeds limit of ${MAX_SIZE}`);
  }

  // Validate MIME type
  const validTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave'];
  if (!validTypes.includes(blob.type)) {
    throw new AudioUploadError('invalid_type', `Invalid MIME type: ${blob.type}`);
  }

  // Build FormData
  const formData = new FormData();
  // Determine file extension from MIME type
  const extensionMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
  };
  const extension = extensionMap[blob.type] || 'webm';
  const filename = `recording.${extension}`;

  formData.append('audio', blob, filename);

  // Make request
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/audio/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
  } catch {
    throw new AudioUploadError('network_error', 'Network request failed');
  }

  // Handle HTTP errors
  if (!response.ok) {
    if (response.status === 401) {
      throw new AudioUploadError('unauthorized', 'Authentication failed');
    }
    if (response.status === 413) {
      throw new AudioUploadError('file_too_large', 'File too large');
    }
    if (response.status === 415) {
      throw new AudioUploadError('invalid_type', 'Invalid file type');
    }
    throw new AudioUploadError('server_error', `Server error: ${response.status}`);
  }

  // Parse response
  const data: AudioUploadResponse = await response.json();
  return data;
}
