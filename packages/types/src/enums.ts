/**
 * Enum types for the Decisions application
 * These types correspond to PostgreSQL ENUM types in the database
 */

/**
 * Status of a decision throughout its lifecycle
 * Maps to PostgreSQL enum: decision_status
 */
export type DecisionStatus = 'draft' | 'in_progress' | 'decided' | 'outcome_recorded';

/**
 * Rating of how the decision outcome compared to expectations
 * Maps to PostgreSQL enum: outcome_rating
 */
export type OutcomeRating = 'better_than_expected' | 'as_expected' | 'worse_than_expected';

/**
 * Category/domain of a decision
 * Maps to PostgreSQL enum: decision_category
 */
export type DecisionCategory =
  | 'career'
  | 'financial'
  | 'relationship'
  | 'health'
  | 'lifestyle'
  | 'other';

/**
 * Emotional state when making or reflecting on a decision
 * Note: This is stored as text in the database, not as an enum
 */
export type EmotionalState =
  | 'confident'
  | 'anxious'
  | 'uncertain'
  | 'excited'
  | 'stressed'
  | 'calm'
  | 'hopeful'
  | 'conflicted';

/**
 * Array of all valid DecisionStatus values
 * Useful for validation and UI generation
 */
export const DECISION_STATUS_VALUES: readonly DecisionStatus[] = [
  'draft',
  'in_progress',
  'decided',
  'outcome_recorded',
] as const;

/**
 * Array of all valid OutcomeRating values
 * Useful for validation and UI generation
 */
export const OUTCOME_RATING_VALUES: readonly OutcomeRating[] = [
  'better_than_expected',
  'as_expected',
  'worse_than_expected',
] as const;

/**
 * Array of all valid DecisionCategory values
 * Useful for validation and UI generation
 */
export const DECISION_CATEGORY_VALUES: readonly DecisionCategory[] = [
  'career',
  'financial',
  'relationship',
  'health',
  'lifestyle',
  'other',
] as const;

/**
 * Array of all valid EmotionalState values
 * Useful for validation and UI generation
 */
export const EMOTIONAL_STATE_VALUES: readonly EmotionalState[] = [
  'confident',
  'anxious',
  'uncertain',
  'excited',
  'stressed',
  'calm',
  'hopeful',
  'conflicted',
] as const;
