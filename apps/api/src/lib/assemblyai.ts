import { AssemblyAI } from 'assemblyai';
import { requireEnvVar } from './index';

let _assemblyai: AssemblyAI | null = null;

/**
 * Get or create the AssemblyAI client.
 * Lazily initialized to allow server startup without env vars for basic routes.
 */
export function getAssemblyAI(): AssemblyAI {
  if (!_assemblyai) {
    const assemblyaiApiKey = requireEnvVar('ASSEMBLYAI_API_KEY');
    _assemblyai = new AssemblyAI({
      apiKey: assemblyaiApiKey,
    });
  }
  return _assemblyai;
}

/**
 * @deprecated Use getAssemblyAI() for lazy initialization
 */
export const assemblyai = {
  get transcripts() {
    return getAssemblyAI().transcripts;
  },
};

/**
 * Default transcription configuration for Italian audio
 * Configuration: language_code: 'it', speaker_labels: false
 */
export const transcriptionConfig = {
  language_code: 'it' as const,
  speaker_labels: false,
};
