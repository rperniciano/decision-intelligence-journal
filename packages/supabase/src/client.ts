import {
  createClient as createSupabaseClient,
  SupabaseClient,
  SupabaseClientOptions,
} from '@supabase/supabase-js';

/**
 * Configuration options for creating a Supabase client.
 */
export interface CreateClientConfig {
  /**
   * The Supabase project URL.
   * Example: https://your-project.supabase.co
   */
  supabaseUrl: string;

  /**
   * The Supabase API key.
   * Use the anon key for client-side or service role key for server-side.
   */
  supabaseKey: string;

  /**
   * Optional Supabase client options.
   */
  options?: SupabaseClientOptions<'public'>;
}

/**
 * Configuration for a browser/client-side Supabase client.
 * Uses the anon key which is safe to expose in the browser.
 */
export interface BrowserClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Configuration for a server-side Supabase admin client.
 * Uses the service role key which bypasses RLS.
 */
export interface AdminClientConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

/**
 * Creates a configurable Supabase client.
 * This is the base factory function that can be used with any configuration.
 *
 * @param config - The client configuration
 * @returns A configured Supabase client instance
 */
export function createClient(config: CreateClientConfig): SupabaseClient {
  const { supabaseUrl, supabaseKey, options } = config;

  if (!supabaseUrl) {
    throw new Error('Supabase URL is required');
  }

  if (!supabaseKey) {
    throw new Error('Supabase key is required');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, options);
}

/**
 * Creates a browser-safe Supabase client using the anonymous key.
 * This client respects Row Level Security (RLS) policies.
 *
 * @param config - Browser client configuration with anon key
 * @returns A Supabase client configured for browser use
 */
export function createBrowserClient(config: BrowserClientConfig): SupabaseClient {
  return createClient({
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseAnonKey,
  });
}

/**
 * Creates a server-side Supabase admin client using the service role key.
 * This client bypasses RLS and should only be used on the server.
 *
 * WARNING: Never expose the service role key to the client!
 *
 * @param config - Admin client configuration with service role key
 * @returns A Supabase client configured for admin/server use
 */
export function createAdminClient(config: AdminClientConfig): SupabaseClient {
  return createClient({
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseServiceRoleKey,
    options: {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  });
}
