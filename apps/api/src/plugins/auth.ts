import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

/**
 * User payload extracted from JWT token
 * Contains the essential user information from Supabase Auth
 */
export interface JWTUser {
  /** User's unique identifier (UUID) */
  id: string;
  /** User's email address */
  email: string;
  /** User's phone number (optional) */
  phone?: string;
  /** User's role from Supabase Auth */
  role?: string;
  /** Authentication assurance level */
  aal?: string;
  /** Session ID */
  session_id?: string;
  /** App metadata from Supabase */
  app_metadata?: Record<string, unknown>;
  /** User metadata from Supabase */
  user_metadata?: Record<string, unknown>;
}

/**
 * Extend FastifyRequest to include the user property
 */
declare module 'fastify' {
  interface FastifyRequest {
    jwtUser: JWTUser;
  }
}

/**
 * Supabase JWT payload structure
 * Based on Supabase Auth JWT structure
 */
interface SupabaseJWTPayload {
  /** Issuer - Supabase Auth URL */
  iss: string;
  /** Subject - User ID (UUID) */
  sub: string;
  /** Audience */
  aud: string | string[];
  /** Expiration time (Unix timestamp) */
  exp: number;
  /** Issued at time (Unix timestamp) */
  iat: number;
  /** User's email */
  email?: string;
  /** User's phone */
  phone?: string;
  /** User's role (authenticated, anon, service_role) */
  role?: string;
  /** Authentication assurance level */
  aal?: string;
  /** Session ID */
  session_id?: string;
  /** App metadata */
  app_metadata?: Record<string, unknown>;
  /** User metadata */
  user_metadata?: Record<string, unknown>;
}

/**
 * Auth plugin options
 */
interface AuthPluginOptions extends FastifyPluginOptions {
  /** JWT secret for token verification */
  jwtSecret?: string;
}

/**
 * Authentication plugin for Fastify
 *
 * Registers @fastify/jwt and provides an authenticate decorator
 * for protecting routes that require authentication.
 *
 * Usage:
 * ```ts
 * fastify.get('/protected', {
 *   preHandler: [fastify.authenticate]
 * }, async (request, reply) => {
 *   return { user: request.jwtUser };
 * });
 * ```
 */
async function authPlugin(
  fastify: FastifyInstance,
  opts: AuthPluginOptions
): Promise<void> {
  const jwtSecret = opts.jwtSecret || fastify.config?.SUPABASE_JWT_SECRET;

  const secret = jwtSecret || 'not-configured';

  if (!jwtSecret) {
    fastify.log.warn(
      'SUPABASE_JWT_SECRET not configured. Authentication will fail for protected routes.'
    );
  }

  // Register @fastify/jwt with Supabase JWT secret
  // Supabase uses HS256 algorithm by default
  await fastify.register(jwt, {
    secret,
    sign: {
      algorithm: 'HS256',
    },
    verify: {
      algorithms: ['HS256'],
    },
    // Use custom decorator name to avoid conflicts
    decoratorName: 'jwtUser',
  });

  // Decorate request with jwtUser property (not auto-done with decoratorName)
  if (!fastify.hasRequestDecorator('jwtUser')) {
    fastify.decorateRequest('jwtUser', null);
  }

  /**
   * Authenticate decorator
   *
   * Validates the JWT token from the Authorization header
   * and extracts user information to request.jwtUser
   */
  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
        // Verify and decode the JWT token
        const decoded = await request.jwtVerify<SupabaseJWTPayload>();

        // Extract user information from the JWT payload
        // Supabase puts the user ID in 'sub' field
        const user: JWTUser = {
          id: decoded.sub,
          email: decoded.email || '',
          phone: decoded.phone,
          role: decoded.role,
          aal: decoded.aal,
          session_id: decoded.session_id,
          app_metadata: decoded.app_metadata,
          user_metadata: decoded.user_metadata,
        };

        // Attach user to request for route handlers
        request.jwtUser = user;
      } catch (err) {
        fastify.log.debug({ err }, 'JWT verification failed');

        // Return 401 Unauthorized for any JWT verification failure
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token',
          statusCode: 401,
        });
      }
    }
  );
}

// Extend FastifyInstance to include authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Export as Fastify plugin with proper encapsulation handling
export default fp(authPlugin, {
  name: 'auth',
  fastify: '4.x',
});

// Named export for testing
export { authPlugin };
