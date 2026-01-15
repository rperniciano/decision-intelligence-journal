import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { JWTUser } from '../plugins/auth';

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
}

export default usersRoutes;
