/**
 * @decisions/supabase
 *
 * Shared Supabase client factory for the Decision Intelligence Journal.
 * Provides configurable client creation for both browser and server environments.
 */

// Client factory functions
export {
  createClient,
  createBrowserClient,
  createAdminClient,
} from './client';

// Configuration types
export type {
  CreateClientConfig,
  BrowserClientConfig,
  AdminClientConfig,
} from './client';

// Re-exported Supabase types
export type {
  SupabaseClient,
  SupabaseClientOptions,
  Session,
  User,
  AuthError,
  AuthResponse,
  AuthTokenResponse,
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
  PostgrestMaybeSingleResponse,
  SignInWithPasswordCredentials,
  SignUpWithPasswordCredentials,
  DatabaseResponse,
  TableRow,
  TableInsert,
  TableUpdate,
} from './types';
