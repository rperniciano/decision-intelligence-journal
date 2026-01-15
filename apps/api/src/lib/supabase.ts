import { createAdminClient, SupabaseClient } from '@decisions/supabase';
import { requireEnvVar } from './index';

/**
 * Singleton Supabase admin client.
 */
let _supabase: SupabaseClient | null = null;

/**
 * Get or create the Supabase admin client.
 * Lazily initialized to allow server startup without env vars for basic routes.
 *
 * This client uses the service role key which bypasses RLS.
 * Use with caution and only for server-side operations.
 *
 * @returns The Supabase admin client instance
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = requireEnvVar('SUPABASE_URL');
    const supabaseServiceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');

    _supabase = createAdminClient({
      supabaseUrl,
      supabaseServiceRoleKey,
    });
  }
  return _supabase;
}

/**
 * Proxy object for backwards compatibility.
 * Prefer using getSupabase() for lazy initialization.
 *
 * @deprecated Use getSupabase() instead
 */
export const supabase: { storage: SupabaseClient['storage'] } = {
  get storage() {
    return getSupabase().storage;
  },
};
