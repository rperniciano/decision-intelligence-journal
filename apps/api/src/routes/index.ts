import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import healthRoutes from './health';
import decisionsRoutes from './decisions';
import usersRoutes from './users';
import audioRoutes from './audio';
import transcriptionRoutes from './transcription';

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

  // Register users routes with /api prefix (for /api/me endpoint)
  await fastify.register(usersRoutes, { prefix: '/api' });

  // Register audio routes with /api/audio prefix
  await fastify.register(audioRoutes, { prefix: '/api/audio' });

  // Register transcription routes with /api/transcription prefix
  await fastify.register(transcriptionRoutes, { prefix: '/api/transcription' });

  // Future routes will be registered here:
  // await fastify.register(categoriesRoutes, { prefix: '/categories' });
}

export default routes;
export { healthRoutes, decisionsRoutes, usersRoutes, audioRoutes, transcriptionRoutes };
