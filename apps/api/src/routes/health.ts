import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import type { DecisionStatus } from '@decisions/shared';

/**
 * Health check response type
 */
interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}

/**
 * Type verification - ensure shared types are importable
 * This demonstrates that @decisions/shared is properly linked
 */
type _VerifySharedTypes = DecisionStatus;

/**
 * Health check routes plugin
 *
 * Registers the /health endpoint for monitoring and liveness checks.
 */
async function healthRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  /**
   * GET /health
   *
   * Returns the health status of the API server.
   * Used by load balancers and monitoring tools.
   */
  fastify.get<{ Reply: HealthResponse }>('/health', async (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });
}

export default healthRoutes;
