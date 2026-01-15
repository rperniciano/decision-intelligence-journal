import { createBrowserClient, SupabaseClient } from '@decisions/supabase';

/**
 * Get the Supabase URL from environment variables.
 */
function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing VITE_SUPABASE_URL environment variable');
  }
  return url;
}

/**
 * Get the Supabase anonymous key from environment variables.
 */
function getSupabaseAnonKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
  }
  return key;
}

/**
 * Singleton Supabase client for browser use.
 * Uses the anonymous key which respects Row Level Security policies.
 */
let _supabase: SupabaseClient | null = null;

/**
 * Get or create the Supabase client for browser use.
 * Lazily initialized to allow the app to render even if env vars are missing.
 *
 * @returns The Supabase client instance
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createBrowserClient({
      supabaseUrl: getSupabaseUrl(),
      supabaseAnonKey: getSupabaseAnonKey(),
    });
  }
  return _supabase;
}

/**
 * Singleton Supabase client instance for backwards compatibility.
 * Uses lazy initialization - the client is created on first access.
 *
 * Note: This getter will throw if env vars are missing.
 * For safer initialization, use getSupabase() directly.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});
