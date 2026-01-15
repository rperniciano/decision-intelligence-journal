/**
 * Decision types for the DecisionsDecisions table
 * Maps to the database schema created in 003_decisions.sql
 */

import type { DecisionStatus, DecisionCategory } from './enums';

/**
 * Main Decision entity
 * Represents a decision record in the DecisionsDecisions table
 */
export interface DecisionsDecision {
  /** UUID primary key */
  id: string;
  /** User ID (references auth.users) */
  userId: string;
  /** Decision title (required) */
  title: string;
  /** Optional detailed description */
  description?: string;
  /** Current status in the decision lifecycle */
  status: DecisionStatus;
  /** Category/domain of the decision */
  category: DecisionCategory;
  /** User's emotional state when recording */
  emotionalState?: string;
  /** URL to the audio recording in Supabase Storage */
  audioUrl?: string;
  /** Transcription of the audio */
  transcript?: string;
  /** Timestamp when the decision was finalized */
  decidedAt?: string;
  /** Timestamp when the record was created */
  createdAt: string;
  /** Timestamp when the record was last updated */
  updatedAt: string;
}

/**
 * Input type for creating a new decision
 * Omits auto-generated fields
 */
export type CreateDecisionsDecisionInput = Omit<
  DecisionsDecision,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Input type for updating an existing decision
 * All fields are optional except id
 */
export type UpdateDecisionsDecisionInput = Partial<
  Omit<DecisionsDecision, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Database row type (snake_case to match PostgreSQL conventions)
 * Used for direct database operations
 */
export interface DecisionsDecisionRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: DecisionStatus;
  category: DecisionCategory;
  emotional_state: string | null;
  audio_url: string | null;
  transcript: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Converts a database row to a Decision entity
 */
export function toDecisionsDecision(row: DecisionsDecisionRow): DecisionsDecision {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    category: row.category,
    emotionalState: row.emotional_state ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    transcript: row.transcript ?? undefined,
    decidedAt: row.decided_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Converts a Decision entity to a database row
 */
export function toDecisionsDecisionRow(
  decision: Omit<DecisionsDecision, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DecisionsDecisionRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: decision.userId,
    title: decision.title,
    description: decision.description ?? null,
    status: decision.status,
    category: decision.category,
    emotional_state: decision.emotionalState ?? null,
    audio_url: decision.audioUrl ?? null,
    transcript: decision.transcript ?? null,
    decided_at: decision.decidedAt ?? null,
  };
}
