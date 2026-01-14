import { createClient } from '@supabase/supabase-js';
import { requireEnvVar } from './index.js';

const supabaseUrl = requireEnvVar('SUPABASE_URL');
const supabaseServiceRoleKey = requireEnvVar('SUPABASE_SERVICE_ROLE_KEY');

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
