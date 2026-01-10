/**
 * Database types for the Decisions application
 * These types map directly to the database schema
 */

// Enum types - using union types for better TypeScript inference
export type DecisionStatus = 'in_progress' | 'decided' | 'abandoned';
export type DecisionOutcome = 'better' | 'as_expected' | 'worse';
export type EmotionalState =
  | 'confident'
  | 'anxious'
  | 'uncertain'
  | 'excited'
  | 'stressed'
  | 'calm'
  | 'conflicted'
  | 'neutral';
export type ProsConsType = 'pro' | 'con';

// Entity interfaces matching database schema

/**
 * User profile entity
 */
export interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Category for organizing decisions
 */
export interface Category {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Main decision entity
 */
export interface Decision {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  raw_transcript?: string;
  audio_url?: string;
  status: DecisionStatus;
  outcome?: DecisionOutcome;
  detected_emotional_state?: EmotionalState;
  category_id?: string;
  decision_date?: string;
  deadline?: string;
  importance?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Option within a decision
 */
export interface Option {
  id: string;
  decision_id: string;
  title: string;
  description?: string;
  is_chosen: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Pro or Con for an option
 */
export interface ProCon {
  id: string;
  option_id: string;
  type: ProsConsType;
  content: string;
  weight?: number;
  created_at: string;
  updated_at: string;
}

// Helper types for creating new entities (without auto-generated fields)
export type CreateDecision = Omit<Decision, 'id' | 'created_at' | 'updated_at'>;
export type CreateOption = Omit<Option, 'id' | 'created_at' | 'updated_at'>;
export type CreateProCon = Omit<ProCon, 'id' | 'created_at' | 'updated_at'>;
export type CreateCategory = Omit<Category, 'id' | 'created_at' | 'updated_at'>;
export type CreateProfile = Omit<Profile, 'id' | 'created_at' | 'updated_at'>;

// Helper types for updating entities (all fields optional except id)
export type UpdateDecision = Partial<Omit<Decision, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;
export type UpdateOption = Partial<Omit<Option, 'id' | 'created_at' | 'updated_at' | 'decision_id'>>;
export type UpdateProCon = Partial<Omit<ProCon, 'id' | 'created_at' | 'updated_at' | 'option_id'>>;
export type UpdateCategory = Partial<Omit<Category, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;
export type UpdateProfile = Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'user_id'>>;
