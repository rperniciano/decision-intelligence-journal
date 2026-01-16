/**
 * Services module - exports all service factories and types
 */

// Transcription service
export {
  getTranscriptionService,
  resetTranscriptionService,
  MockTranscriptionService,
  DEFAULT_MOCK_TEXT,
} from './transcription';

export type {
  TranscriptionService,
  TranscriptionResult,
  TranscriptionWord,
} from './transcription';
