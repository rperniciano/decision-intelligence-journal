import { z } from 'zod';

/**
 * Environment variable schema using Zod
 * All environment variables are validated at startup
 */
export const envSchema = z.object({
  // Server Configuration
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  CORS_ORIGIN: z.string().optional(),

  // Supabase Configuration (required for most features)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),

  // AI Services (optional - mock services used if not provided)
  ASSEMBLYAI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

/**
 * TypeScript type for validated environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * JSON Schema for @fastify/env plugin
 * Generated from Zod schema for Fastify compatibility
 */
export const fastifyEnvSchema = {
  type: 'object',
  required: [],
  properties: {
    PORT: {
      type: 'number',
      default: 3001,
    },
    HOST: {
      type: 'string',
      default: '0.0.0.0',
    },
    NODE_ENV: {
      type: 'string',
      enum: ['development', 'production', 'test'],
      default: 'development',
    },
    LOG_LEVEL: {
      type: 'string',
      enum: ['trace', 'debug', 'info', 'warn', 'error', 'fatal'],
      default: 'info',
    },
    CORS_ORIGIN: {
      type: 'string',
    },
    SUPABASE_URL: {
      type: 'string',
    },
    SUPABASE_ANON_KEY: {
      type: 'string',
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      type: 'string',
    },
    SUPABASE_JWT_SECRET: {
      type: 'string',
    },
    ASSEMBLYAI_API_KEY: {
      type: 'string',
    },
    OPENAI_API_KEY: {
      type: 'string',
    },
  },
} as const;

/**
 * Validates environment variables using Zod schema
 * Throws a detailed error if validation fails
 */
export function validateEnv(env: Record<string, unknown>): Env {
  const result = envSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

/**
 * Helper to check if Supabase is configured
 */
export function isSupabaseConfigured(env: Env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Helper to check if AI services are configured
 */
export function isAIConfigured(env: Env): boolean {
  return Boolean(env.ASSEMBLYAI_API_KEY && env.OPENAI_API_KEY);
}
