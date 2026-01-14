import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import routes from './routes/index.js';

// Environment configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Create Fastify instance with logging enabled
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

// Register CORS plugin for frontend communication
await server.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

// Register multipart plugin for file uploads (50MB limit)
await server.register(multipart, {
  limits: {
    fileSize: 52428800, // 50MB in bytes
  },
});

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
    await server.listen({ port: PORT, host: HOST });
    server.log.info(`Server is running on http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err, 'Failed to start server');
    process.exit(1);
  }
};

start();

export { server };
