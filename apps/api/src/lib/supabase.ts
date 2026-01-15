import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { requireEnvVar } from './index';

let _supabase: SupabaseClient | null = null;

/**
 * Get or create the Supabase client.
 * Lazily initialized to allow server startup without env vars for basic routes.
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = requireEnvVar('SUPABASE_URL');
    const supabaseServiceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');

    _supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabase;
}

/**
 * Proxy object for backwards compatibility.
 * @deprecated Use getSupabase() for lazy initialization
 */
export const supabase: { storage: SupabaseClient['storage'] } = {
  get storage() {
    return getSupabase().storage;
  },
};
