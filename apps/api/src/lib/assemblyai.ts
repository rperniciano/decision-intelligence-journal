import { AssemblyAI } from 'assemblyai';
import { requireEnvVar } from './index.js';

const assemblyaiApiKey = requireEnvVar('ASSEMBLYAI_API_KEY');

/**
 * AssemblyAI client instance configured for Italian transcription
 */
export const assemblyai = new AssemblyAI({
  apiKey: assemblyaiApiKey,
});

/**
 * Default transcription configuration for Italian audio
 * Configuration: language_code: 'it', speaker_labels: false
 */
export const transcriptionConfig = {
  language_code: 'it' as const,
  speaker_labels: false,
};
