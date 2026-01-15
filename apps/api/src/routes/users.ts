import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { JWTUser } from '../plugins/auth';
import type { CreateProfileRequest, ProfileResponse, ApiError } from '@decisions/types';
import { getSupabase } from '../lib/supabase';

/**
 * User info response type
 */
interface UserInfoResponse {
  id: string;
  email: string;
  phone?: string;
  role?: string;
  aal?: string;
  session_id?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

/**
 * Error response type
 */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

/**
 * Database row type for DecisionsUserProfiles table
 */
interface UserProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Users routes plugin
 *
 * Provides user-related endpoints including the protected /me endpoint.
 */
async function usersRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  /**
   * GET /me
   *
   * Returns information about the currently authenticated user.
   * Requires a valid JWT token in the Authorization header.
   *
   * @returns {UserInfoResponse} The authenticated user's information
   * @throws {401} If the token is missing or invalid
   */
  fastify.get<{
    Reply: UserInfoResponse | ErrorResponse;
  }>(
    '/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, _reply) => {
      const user: JWTUser = request.jwtUser;

      return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        aal: user.aal,
        session_id: user.session_id,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      };
    }
  );

  /**
   * POST /users/profile
   *
   * Creates a new profile for the authenticated user.
   * Requires a valid JWT token in the Authorization header.
   *
   * @body {CreateProfileRequest} - Optional display name
   * @returns {ProfileResponse} The created profile (201)
   * @throws {401} If the token is missing or invalid
   * @throws {409} If the profile already exists
   * @throws {500} If there's a database error
   */
  fastify.post<{
    Body: CreateProfileRequest;
    Reply: ProfileResponse | ApiError;
  }>(
    '/users/profile',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      const user: JWTUser = request.jwtUser;
      const { displayName } = request.body || {};

      const supabase = getSupabase();

      // Check if profile already exists
      const { data: existingProfile, error: selectError } = await supabase
        .from('DecisionsUserProfiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - any other error is a problem
        fastify.log.error({ error: selectError }, 'Error checking existing profile');
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to check existing profile',
        });
      }

      if (existingProfile) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Profile already exists for this user',
        });
      }

      // Create new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('DecisionsUserProfiles')
        .insert({
          id: user.id,
          display_name: displayName || null,
        })
        .select()
        .single();

      if (insertError) {
        fastify.log.error({ error: insertError }, 'Error creating profile');

        // Handle unique constraint violation (race condition)
        if (insertError.code === '23505') {
          return reply.status(409).send({
            statusCode: 409,
            error: 'Conflict',
            message: 'Profile already exists for this user',
          });
        }

        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to create profile',
        });
      }

      const profile = newProfile as UserProfileRow;

      return reply.status(201).send({
        id: profile.id,
        displayName: profile.display_name || undefined,
        avatarUrl: profile.avatar_url || undefined,
        onboardingCompleted: profile.onboarding_completed,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      });
    }
  );
}

export default usersRoutes;
