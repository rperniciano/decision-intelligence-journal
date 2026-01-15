/**
 * Database types for the Decisions application
 * These types map directly to the database schema
 */

// Enum types - using union types for better TypeScript inference
export type DecisionStatus = 'draft' | 'in_progress' | 'decided' | 'outcome_recorded';
export type OutcomeRating = 'better_than_expected' | 'as_expected' | 'worse_than_expected';
export type DecisionCategory =
  | 'career'
  | 'financial'
  | 'relationship'
  | 'health'
  | 'lifestyle'
  | 'other';
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
 * Decision entity
 */
export interface Decision {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: DecisionStatus;
  category: DecisionCategory;
  emotionalState?: EmotionalState;
  audioUrl?: string;
  transcript?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Decision option entity
 */
export interface DecisionOption {
  id: string;
  decisionId: string;
  title: string;
  description?: string;
  isChosen: boolean;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Option pro/con entity
 */
export interface OptionProCon {
  id: string;
  optionId: string;
  content: string;
  isPro: boolean;
  weight: number;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Decision outcome entity
 */
export interface DecisionOutcome {
  id: string;
  decisionId: string;
  rating: OutcomeRating;
  notes?: string;
  audioUrl?: string;
  transcript?: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Follow-up reminder entity
 */
export interface FollowUpReminder {
  id: string;
  decisionId: string;
  scheduledFor: string;
  sentAt?: string;
  isDismissed: boolean;
  createdAt: string;
  updatedAt: string;
}
