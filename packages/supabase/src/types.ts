/**
 * Re-export common Supabase types for convenience.
 * Users of this package can import types from here instead of @supabase/supabase-js directly.
 */
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
} from '@supabase/supabase-js';

/**
 * Generic database response type.
 * Used as a placeholder until proper database types are generated.
 */
export interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Helper type for extracting the table type from a database schema.
 * This is a placeholder that can be replaced with generated types.
 */
export type TableRow<T extends Record<string, unknown>> = T;

/**
 * Helper type for insert operations.
 * Makes id and timestamps optional since they're usually auto-generated.
 */
export type TableInsert<T extends Record<string, unknown>> = Omit<
  T,
  'id' | 'created_at' | 'updated_at'
> &
  Partial<Pick<T, 'id' | 'created_at' | 'updated_at'>>;

/**
 * Helper type for update operations.
 * Makes all fields optional.
 */
export type TableUpdate<T extends Record<string, unknown>> = Partial<T>;
