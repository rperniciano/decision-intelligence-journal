import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import healthRoutes from './health';
import decisionsRoutes from './decisions';

/**
 * Main routes plugin
 *
 * Registers all API routes with the Fastify instance.
 * Add new route plugins here as the API grows.
 */
async function routes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  // Register health check routes
  await fastify.register(healthRoutes);

  // Register decisions routes with /decisions prefix
  await fastify.register(decisionsRoutes, { prefix: '/decisions' });

  // Future routes will be registered here:
  // await fastify.register(categoriesRoutes, { prefix: '/categories' });
}

export default routes;
export { healthRoutes, decisionsRoutes };
