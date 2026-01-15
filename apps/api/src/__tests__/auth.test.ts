import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import authPlugin from '../plugins/auth';
import usersRoutes from '../routes/users';

// Test JWT secret - only used for testing
const TEST_JWT_SECRET = 'test-secret-key-for-jwt-testing-only';

/**
 * Helper function to create a test JWT token
 * Uses the JWT plugin registered by authPlugin
 */
function createTestToken(
  app: FastifyInstance,
  payload: Record<string, unknown>,
  options?: { expiresIn?: string }
): string {
  return app.jwt.sign(payload, {
    expiresIn: options?.expiresIn || '1h',
  });
}

describe('Auth Plugin and /api/me Route', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();

    // Register auth plugin with test secret
    // This also registers @fastify/jwt internally
    await app.register(authPlugin, {
      jwtSecret: TEST_JWT_SECRET,
    });

    // Register users routes
    await app.register(usersRoutes, { prefix: '/api' });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/me', () => {
    it('returns 200 with user info when valid token is provided', async () => {
      const testUser = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        phone: '+1234567890',
        role: 'authenticated',
        aal: 'aal1',
        session_id: 'session-123',
        app_metadata: { provider: 'email' },
        user_metadata: { name: 'Test User' },
      };

      const token = createTestToken(app, testUser);

      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.id).toBe(testUser.sub);
      expect(body.email).toBe(testUser.email);
      expect(body.phone).toBe(testUser.phone);
      expect(body.role).toBe(testUser.role);
      expect(body.aal).toBe(testUser.aal);
      expect(body.session_id).toBe(testUser.session_id);
      expect(body.app_metadata).toEqual(testUser.app_metadata);
      expect(body.user_metadata).toEqual(testUser.user_metadata);
    });

    it('returns 401 when no token is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Invalid or missing authentication token');
      expect(body.statusCode).toBe(401);
    });

    it('returns 401 when invalid token is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe('Invalid or missing authentication token');
      expect(body.statusCode).toBe(401);
    });

    it('returns 401 when token is expired', async () => {
      const testUser = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        // Create an expired token by setting exp to a past timestamp
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour in the past
      };

      // Sign the token without expiresIn since we're setting exp manually
      const token = app.jwt.sign(testUser);

      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when authorization header has wrong format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: {
          authorization: 'Basic some-credentials',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 401 when token is signed with wrong secret', async () => {
      // Create a separate Fastify instance with a different secret
      const otherApp = Fastify();
      await otherApp.register(authPlugin, {
        jwtSecret: 'different-secret-that-is-not-the-same',
      });
      await otherApp.ready();

      const testUser = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };

      const invalidToken = otherApp.jwt.sign(testUser, { expiresIn: '1h' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      });

      expect(response.statusCode).toBe(401);

      await otherApp.close();
    });

    it('returns 200 with minimal user info when only sub and email are in token', async () => {
      const minimalUser = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'minimal@example.com',
      };

      const token = createTestToken(app, minimalUser);

      const response = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.id).toBe(minimalUser.sub);
      expect(body.email).toBe(minimalUser.email);
      // Optional fields should be undefined
      expect(body.phone).toBeUndefined();
      expect(body.role).toBeUndefined();
    });
  });
});
