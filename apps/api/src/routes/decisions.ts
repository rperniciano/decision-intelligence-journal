import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import { randomUUID } from 'crypto';
import { supabase } from '../lib/supabase';
import { assemblyai, transcriptionConfig } from '../lib/assemblyai';

/**
 * Voice transcription success response
 */
interface VoiceResponse {
  decisionId: string;
  transcript: string;
  audioUrl: string;
}

/**
 * Voice transcription error response
 */
interface VoiceErrorResponse {
  error: string;
  code: string;
  message: string;
}

/**
 * Error codes for voice transcription
 */
const ErrorCodes = {
  MISSING_FILE: 'MISSING_FILE',
  INVALID_FORMAT: 'INVALID_FORMAT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  TIMEOUT: 'TIMEOUT',
} as const;

/**
 * Maximum file size in bytes (50MB)
 */
const MAX_FILE_SIZE = 52428800;

/**
 * Allowed audio MIME types
 */
const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/ogg',
];

/**
 * Supabase Storage bucket for audio files
 */
const AUDIO_BUCKET = 'decision-audio';

/**
 * Signed URL expiry time in seconds (1 hour)
 */
const SIGNED_URL_EXPIRY = 3600;

/**
 * Decisions routes plugin
 *
 * Registers endpoints for decision-related operations including
 * voice transcription.
 */
async function decisionsRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  /**
   * POST /voice
   *
   * Handles audio file upload and transcription.
   * Flow: validate file -> upload to Supabase Storage -> transcribe via AssemblyAI -> return result
   */
  fastify.post<{ Reply: VoiceResponse | VoiceErrorResponse }>('/voice', async (request, reply) => {
    const startTime = Date.now();
    const requestId = randomUUID();

    fastify.log.info({ requestId }, 'Voice transcription request started');

    // Step 1: Get and validate the uploaded file
    let audioData: MultipartFile | undefined;

    try {
      audioData = await request.file();
    } catch (err) {
      fastify.log.error({ requestId, error: err }, 'Failed to parse multipart data');
      return reply.status(400).send({
        error: 'Invalid request',
        code: ErrorCodes.MISSING_FILE,
        message: 'Could not parse multipart form data. Please upload an audio file.',
      });
    }

    if (!audioData) {
      fastify.log.warn({ requestId }, 'No audio file provided');
      return reply.status(400).send({
        error: 'Missing file',
        code: ErrorCodes.MISSING_FILE,
        message: 'No audio file provided. Please upload an audio file.',
      });
    }

    fastify.log.info(
      {
        requestId,
        filename: audioData.filename,
        mimetype: audioData.mimetype,
        fieldname: audioData.fieldname,
      },
      'Audio file received'
    );

    // Validate MIME type
    if (!ALLOWED_AUDIO_TYPES.includes(audioData.mimetype)) {
      fastify.log.warn({ requestId, mimetype: audioData.mimetype }, 'Invalid audio format');
      return reply.status(400).send({
        error: 'Invalid format',
        code: ErrorCodes.INVALID_FORMAT,
        message: `Invalid audio format: ${audioData.mimetype}. Allowed formats: ${ALLOWED_AUDIO_TYPES.join(', ')}`,
      });
    }

    // Step 2: Read the file buffer and validate size
    const audioBuffer = await audioData.toBuffer();
    const fileSize = audioBuffer.length;

    if (fileSize > MAX_FILE_SIZE) {
      fastify.log.warn({ requestId, fileSize, maxSize: MAX_FILE_SIZE }, 'File too large');
      return reply.status(400).send({
        error: 'File too large',
        code: ErrorCodes.FILE_TOO_LARGE,
        message: `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds the maximum allowed size of 50MB.`,
      });
    }

    fastify.log.info(
      { requestId, fileSize: `${Math.round(fileSize / 1024)}KB` },
      'File size validated'
    );

    // Step 3: Generate decision ID and storage path
    const decisionId = randomUUID();
    // For now, use 'anonymous' as userId - in production, extract from auth token
    const userId = 'anonymous';
    const storagePath = `${userId}/${decisionId}/recording.webm`;

    fastify.log.info({ requestId, decisionId, storagePath }, 'Generated storage path');

    // Step 4: Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(storagePath, audioBuffer, {
        contentType: audioData.mimetype,
        upsert: false,
      });

    if (uploadError) {
      fastify.log.error(
        { requestId, decisionId, error: uploadError },
        'Failed to upload audio to storage'
      );
      return reply.status(500).send({
        error: 'Upload failed',
        code: ErrorCodes.UPLOAD_FAILED,
        message: 'Failed to upload audio file. Please try again.',
      });
    }

    fastify.log.info({ requestId, decisionId, storagePath }, 'Audio uploaded to storage');

    // Step 5: Generate signed URL for AssemblyAI access
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      fastify.log.error(
        { requestId, decisionId, error: signedUrlError },
        'Failed to generate signed URL'
      );
      return reply.status(500).send({
        error: 'Upload failed',
        code: ErrorCodes.UPLOAD_FAILED,
        message: 'Failed to generate access URL for transcription. Please try again.',
      });
    }

    const audioUrl = signedUrlData.signedUrl;
    fastify.log.info({ requestId, decisionId }, 'Signed URL generated for transcription');

    // Step 6: Submit to AssemblyAI for transcription
    fastify.log.info(
      { requestId, decisionId, language: transcriptionConfig.language_code },
      'Starting transcription'
    );

    try {
      const transcriptResult = await assemblyai.transcripts.transcribe({
        audio: audioUrl,
        ...transcriptionConfig,
      });

      if (transcriptResult.status === 'error') {
        fastify.log.error(
          {
            requestId,
            decisionId,
            error: transcriptResult.error,
          },
          'Transcription failed'
        );
        return reply.status(500).send({
          error: 'Transcription failed',
          code: ErrorCodes.TRANSCRIPTION_FAILED,
          message: transcriptResult.error || 'Failed to transcribe audio. Please try again.',
        });
      }

      const transcript = transcriptResult.text || '';
      const duration = Date.now() - startTime;

      fastify.log.info(
        {
          requestId,
          decisionId,
          transcriptLength: transcript.length,
          durationMs: duration,
        },
        'Transcription completed successfully'
      );

      // Return successful response
      return reply.status(200).send({
        decisionId,
        transcript,
        audioUrl,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      fastify.log.error(
        { requestId, decisionId, error: errorMessage },
        'Transcription request failed'
      );
      return reply.status(500).send({
        error: 'Transcription failed',
        code: ErrorCodes.TRANSCRIPTION_FAILED,
        message: 'Failed to transcribe audio. Please try again.',
      });
    }
  });
}

export default decisionsRoutes;
