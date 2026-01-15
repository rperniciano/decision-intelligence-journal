/**
 * Database types for the Decisions application
 * These types map directly to the database schema
 */

// Re-export enum types from enums module
export type {
  DecisionStatus,
  OutcomeRating,
  DecisionCategory,
  EmotionalState,
} from './enums';

// Import for use in this file
import type {
  DecisionStatus,
  OutcomeRating,
  DecisionCategory,
  EmotionalState,
} from './enums';

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
