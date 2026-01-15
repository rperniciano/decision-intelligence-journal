import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import multipart from '@fastify/multipart';
import authPlugin from './plugins/auth';
import routes from './routes/index';
import { fastifyEnvSchema, type Env } from './config/env';

// Extend FastifyInstance to include config
declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}

// Create Fastify instance with logging enabled
// Note: We read log settings from process.env initially,
// then use validated config after @fastify/env is registered
const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Register @fastify/env for environment variable validation
// This must be registered before other plugins that depend on config
await server.register(fastifyEnv, {
  confKey: 'config',
  schema: fastifyEnvSchema,
  dotenv: true,
});

// Register CORS plugin for frontend communication
await server.register(cors, {
  origin: server.config.CORS_ORIGIN || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

// Register multipart plugin for file uploads (50MB limit)
await server.register(multipart, {
  limits: {
    fileSize: 52428800, // 50MB in bytes
  },
});

// Register authentication plugin
// This provides the authenticate decorator for protected routes
await server.register(authPlugin);

// Register API routes
await server.register(routes);

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  server.log.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await server.close();
    process.exit(0);
  } catch (err) {
    server.log.error(err, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start server
const start = async () => {
  try {
    const { PORT, HOST } = server.config;
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Server is running on http://${HOST}:${PORT}`);
    server.log.info(`Environment: ${server.config.NODE_ENV}`);
  } catch (err) {
    server.log.error(err, 'Failed to start server');
    process.exit(1);
  }
};

start();

export { server };
