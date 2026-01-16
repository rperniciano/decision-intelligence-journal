import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { JWTUser } from '../plugins/auth';
import type { AudioUploadResponse, ApiError } from '@decisions/types';
import { getSupabase } from '../lib/supabase';
import { randomUUID } from 'crypto';

/**
 * Constants for audio upload validation
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
const ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
];
const BUCKET_NAME = 'decision-audio';

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExtension: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/wave': 'wav',
  };
  return mimeToExtension[mimeType] || 'webm';
}

/**
 * Audio routes plugin
 *
 * Provides audio-related endpoints including file upload to Supabase Storage.
 */
async function audioRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  /**
   * POST /upload
   *
   * Upload an audio file to Supabase Storage.
   * Requires a valid JWT token in the Authorization header.
   *
   * @body multipart/form-data with 'audio' field
   * @returns {AudioUploadResponse} The uploaded file info (url, path, size)
   * @throws {400} If no file is provided
   * @throws {401} If the token is missing or invalid
   * @throws {413} If the file exceeds the size limit (10MB)
   * @throws {415} If the file type is not allowed (not audio/*)
   * @throws {500} If there's a storage upload error
   */
  fastify.post<{
    Reply: AudioUploadResponse | ApiError;
  }>(
    '/upload',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user: JWTUser = request.jwtUser;

      // Get the uploaded file
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'No audio file provided',
        });
      }

      // Validate MIME type
      const mimeType = file.mimetype;
      if (!mimeType.startsWith('audio/') && !ALLOWED_MIME_TYPES.includes(mimeType)) {
        return reply.status(415).send({
          statusCode: 415,
          error: 'Unsupported Media Type',
          message: `Invalid file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
        });
      }

      // Consume the file stream into a buffer
      const chunks: Buffer[] = [];
      let totalSize = 0;

      try {
        for await (const chunk of file.file) {
          totalSize += chunk.length;

          // Check size limit during streaming (early abort)
          if (totalSize > MAX_FILE_SIZE) {
            return reply.status(413).send({
              statusCode: 413,
              error: 'Payload Too Large',
              message: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
            });
          }

          chunks.push(chunk);
        }
      } catch (err) {
        fastify.log.error({ error: err }, 'Error reading file stream');
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to read uploaded file',
        });
      }

      // Check if stream was truncated by busboy limit
      if (file.file.truncated) {
        return reply.status(413).send({
          statusCode: 413,
          error: 'Payload Too Large',
          message: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        });
      }

      const fileBuffer = Buffer.concat(chunks);
      const fileSize = fileBuffer.length;

      // Double-check final size (shouldn't be needed, but defensive)
      if (fileSize > MAX_FILE_SIZE) {
        return reply.status(413).send({
          statusCode: 413,
          error: 'Payload Too Large',
          message: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        });
      }

      // Generate unique filename with user folder
      const extension = getExtensionFromMimeType(mimeType);
      const fileName = `${randomUUID()}.${extension}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const supabase = getSupabase();
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        fastify.log.error({ error: uploadError }, 'Error uploading to Supabase Storage');
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to upload audio file to storage',
        });
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return reply.status(201).send({
        url: urlData.publicUrl,
        path: data.path,
        size: fileSize,
      });
    }
  );
}

export default audioRoutes;
