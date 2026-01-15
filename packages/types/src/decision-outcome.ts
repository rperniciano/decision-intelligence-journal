/**
 * Decision Outcome types for the DecisionsDecisionOutcomes table
 * Maps to the database schema created in 006_decision_outcomes.sql
 */

import type { OutcomeRating } from './enums';

/**
 * Main DecisionOutcome entity
 * Represents the outcome/result of a decision in the DecisionsDecisionOutcomes table
 * Note: Each decision can have at most one outcome (enforced by UNIQUE constraint on decision_id)
 */
export interface DecisionsDecisionOutcome {
  /** UUID primary key */
  id: string;
  /** Decision ID (references DecisionsDecisions, UNIQUE) */
  decisionId: string;
  /** Rating of how the outcome compared to expectations */
  rating: OutcomeRating;
  /** Optional notes about the outcome */
  notes: string | null;
  /** Optional URL to audio recording of outcome reflection */
  audioUrl: string | null;
  /** Optional transcript of audio recording */
  transcript: string | null;
  /** Timestamp when the outcome was recorded */
  recordedAt: string;
  /** Timestamp when the record was created */
  createdAt: string;
  /** Timestamp when the record was last updated */
  updatedAt: string;
}

/**
 * Input type for creating a new decision outcome
 * Omits auto-generated fields
 */
export type CreateDecisionsDecisionOutcomeInput = Omit<
  DecisionsDecisionOutcome,
  'id' | 'recordedAt' | 'createdAt' | 'updatedAt'
> & {
  /** Optional custom recorded_at timestamp (defaults to now()) */
  recordedAt?: string;
};

/**
 * Input type for updating an existing decision outcome
 * All fields are optional except id
 * Note: decisionId cannot be changed after creation
 */
export type UpdateDecisionsDecisionOutcomeInput = Partial<
  Omit<DecisionsDecisionOutcome, 'id' | 'decisionId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Database row type (snake_case to match PostgreSQL conventions)
 * Used for direct database operations
 */
export interface DecisionsDecisionOutcomeRow {
  id: string;
  decision_id: string;
  rating: OutcomeRating;
  notes: string | null;
  audio_url: string | null;
  transcript: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Converts a database row to a DecisionOutcome entity
 */
export function toDecisionsDecisionOutcome(
  row: DecisionsDecisionOutcomeRow
): DecisionsDecisionOutcome {
  return {
    id: row.id,
    decisionId: row.decision_id,
    rating: row.rating,
    notes: row.notes,
    audioUrl: row.audio_url,
    transcript: row.transcript,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Converts a DecisionOutcome entity to a database row for insertion
 */
export function toDecisionsDecisionOutcomeRow(
  outcome: Omit<DecisionsDecisionOutcome, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DecisionsDecisionOutcomeRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    decision_id: outcome.decisionId,
    rating: outcome.rating,
    notes: outcome.notes,
    audio_url: outcome.audioUrl,
    transcript: outcome.transcript,
    recorded_at: outcome.recordedAt,
  };
}
