import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { JWTUser } from '../plugins/auth';
import type { TranscriptionRequest, TranscriptionResponse, ApiError } from '@decisions/types';
import { getSupabase } from '../lib/supabase';
import { getTranscriptionService, AssemblyAITranscriptionError } from '../services/transcription';

/**
 * Storage bucket name for audio files
 */
const BUCKET_NAME = 'decision-audio';

/**
 * Validate that an audio path belongs to the authenticated user
 *
 * @param path - Storage path (format: {user_id}/{filename})
 * @param userId - The authenticated user's ID
 * @returns true if path belongs to user, false otherwise
 */
function validateAudioPathOwnership(path: string, userId: string): boolean {
  // Audio paths are stored as {user_id}/{filename}
  // Extract the user ID from the path and compare
  const pathParts = path.split('/');
  if (pathParts.length < 2) {
    return false;
  }
  const pathUserId = pathParts[0];
  return pathUserId === userId;
}

/**
 * Extract storage path from audio URL if it's from our Supabase bucket
 *
 * @param audioUrl - Full URL to the audio file
 * @returns The storage path if it's from our bucket, null otherwise
 */
function extractPathFromUrl(audioUrl: string): string | null {
  try {
    const url = new URL(audioUrl);
    // Supabase storage URLs have the path after /storage/v1/object/public/{bucket}/
    // Example: https://xxx.supabase.co/storage/v1/object/public/decision-audio/user-id/file.webm
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/decision-audio\/(.+)/);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the public URL for a storage path
 *
 * @param path - Storage path (format: {user_id}/{filename})
 * @returns Public URL for the audio file
 */
function getPublicUrl(path: string): string {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Transcription routes plugin
 *
 * Provides endpoints for transcribing audio files using the transcription service.
 */
async function transcriptionRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  /**
   * POST /
   *
   * Transcribe an audio file from URL or storage path.
   * Requires a valid JWT token in the Authorization header.
   * Validates that the audio belongs to the authenticated user.
   *
   * @body {TranscriptionRequest} audioUrl OR audioPath
   * @returns {TranscriptionResponse} The transcription result (text, confidence)
   * @throws {400} If neither audioUrl nor audioPath is provided
   * @throws {401} If the token is missing or invalid
   * @throws {403} If the audio doesn't belong to the user
   * @throws {502} If the transcription service fails
   */
  fastify.post<{
    Body: TranscriptionRequest;
    Reply: TranscriptionResponse | ApiError;
  }>(
    '/',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user: JWTUser = request.jwtUser;
      const { audioUrl, audioPath } = request.body;

      // Validate that at least one of audioUrl or audioPath is provided
      if (!audioUrl && !audioPath) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Either audioUrl or audioPath must be provided',
        });
      }

      let finalAudioUrl: string;
      let storagePath: string | null = null;

      if (audioPath) {
        // If audioPath is provided, validate ownership and get public URL
        storagePath = audioPath;
        if (!validateAudioPathOwnership(storagePath, user.id)) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You do not have permission to access this audio file',
          });
        }
        finalAudioUrl = getPublicUrl(storagePath);
      } else if (audioUrl) {
        // If audioUrl is provided, try to extract storage path and validate ownership
        storagePath = extractPathFromUrl(audioUrl);

        if (storagePath) {
          // It's from our storage, validate ownership
          if (!validateAudioPathOwnership(storagePath, user.id)) {
            return reply.status(403).send({
              statusCode: 403,
              error: 'Forbidden',
              message: 'You do not have permission to access this audio file',
            });
          }
        }
        // If it's not from our storage (external URL), we allow it
        // This enables transcription of external audio files if needed
        finalAudioUrl = audioUrl;
      } else {
        // This shouldn't happen due to the check above, but TypeScript needs it
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Either audioUrl or audioPath must be provided',
        });
      }

      // Call the transcription service
      try {
        const transcriptionService = getTranscriptionService();
        const result = await transcriptionService.transcribe(finalAudioUrl);

        return reply.status(200).send({
          text: result.text,
          confidence: result.confidence,
        });
      } catch (error) {
        // Log the error
        fastify.log.error({ error }, 'Transcription service error');

        // Handle AssemblyAI specific errors
        if (error instanceof AssemblyAITranscriptionError) {
          return reply.status(502).send({
            statusCode: 502,
            error: 'Bad Gateway',
            message: `Transcription service error: ${error.message}`,
            details: {
              code: error.code,
              retryable: error.retryable,
            },
          });
        }

        // Handle generic errors
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown transcription error';
        return reply.status(502).send({
          statusCode: 502,
          error: 'Bad Gateway',
          message: `Transcription service failed: ${errorMessage}`,
        });
      }
    }
  );
}

export default transcriptionRoutes;
