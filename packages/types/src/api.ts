/**
 * API types for the Decisions application
 * These types define request/response shapes for the API endpoints
 */

import type { DecisionStatus, DecisionCategory, OutcomeRating } from './enums';
import type { DecisionsDecision } from './decision';
import type { DecisionsDecisionOption } from './decision-option';
import type { DecisionsOptionProCon } from './option-pro-con';
import type { DecisionsDecisionOutcome } from './decision-outcome';
import type { DecisionsFollowUpReminder } from './followup-reminder';

// ============================================================================
// Common API Types
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  /** HTTP status code */
  statusCode: number;
  /** Error type/code */
  error: string;
  /** Human-readable error message */
  message: string;
  /** Optional additional error details */
  details?: Record<string, unknown>;
}

/**
 * Paginated list response metadata
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Generic paginated list response
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];
  /** Pagination metadata */
  meta: PaginationMeta;
}

// ============================================================================
// Option Pro/Con Types (for nested creation)
// ============================================================================

/**
 * Pro/con data for creating a new option (used in nested creation)
 */
export interface CreateProConInput {
  /** The pro/con content text */
  content: string;
  /** True for pro, false for con */
  isPro: boolean;
  /** Weight/importance (1-5), defaults to 1 */
  weight?: number;
  /** Order/position in the list, defaults to 0 */
  orderIndex?: number;
}

// ============================================================================
// Decision Option Types (for nested creation)
// ============================================================================

/**
 * Option data for creating a new decision (used in nested creation)
 */
export interface CreateOptionInput {
  /** Option title */
  title: string;
  /** Optional description */
  description?: string;
  /** Whether this option is chosen (defaults to false) */
  isChosen?: boolean;
  /** Order/position in the list, defaults to 0 */
  orderIndex?: number;
  /** Pros and cons for this option */
  prosCons?: CreateProConInput[];
}

/**
 * Option data for updating a decision (used in nested update)
 */
export interface UpdateOptionInput {
  /** Option ID (required for existing options, omit for new options) */
  id?: string;
  /** Option title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Whether this option is chosen */
  isChosen?: boolean;
  /** Order/position in the list */
  orderIndex?: number;
  /** Pros and cons for this option (replaces existing if provided) */
  prosCons?: CreateProConInput[];
  /** Set to true to delete this option */
  _delete?: boolean;
}

// ============================================================================
// Decision Request Types
// ============================================================================

/**
 * Request body for creating a new decision
 * POST /api/decisions
 */
export interface CreateDecisionRequest {
  /** Decision title (required) */
  title: string;
  /** Optional detailed description */
  description?: string;
  /** Initial status (defaults to 'draft') */
  status?: DecisionStatus;
  /** Category/domain (defaults to 'other') */
  category?: DecisionCategory;
  /** User's emotional state when recording */
  emotionalState?: string;
  /** URL to audio recording in Supabase Storage */
  audioUrl?: string;
  /** Transcription of the audio */
  transcript?: string;
  /** Options for this decision (with nested pros/cons) */
  options?: CreateOptionInput[];
}

/**
 * Request body for updating an existing decision
 * PATCH /api/decisions/:id
 */
export interface UpdateDecisionRequest {
  /** Updated title */
  title?: string;
  /** Updated description */
  description?: string;
  /** Updated status */
  status?: DecisionStatus;
  /** Updated category */
  category?: DecisionCategory;
  /** Updated emotional state */
  emotionalState?: string;
  /** Updated audio URL */
  audioUrl?: string;
  /** Updated transcript */
  transcript?: string;
  /** Updated timestamp when decision was finalized */
  decidedAt?: string;
  /** Options to add/update/remove */
  options?: UpdateOptionInput[];
}

/**
 * Query parameters for listing decisions
 * GET /api/decisions
 */
export interface ListDecisionsQuery {
  /** Filter by status (comma-separated for multiple) */
  status?: string;
  /** Filter by category (comma-separated for multiple) */
  category?: string;
  /** Search in title */
  search?: string;
  /** Page number (1-indexed), defaults to 1 */
  page?: number;
  /** Items per page, defaults to 20 */
  limit?: number;
  /** Field to sort by */
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'decidedAt';
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Request body for marking a decision as decided
 * POST /api/decisions/:id/decide
 */
export interface MarkAsDecidedRequest {
  /** ID of the chosen option */
  chosenOptionId: string;
}

// ============================================================================
// Decision Response Types
// ============================================================================

/**
 * Option with nested pros/cons for API responses
 */
export interface DecisionOptionWithProsCons extends DecisionsDecisionOption {
  /** Pros and cons for this option */
  prosCons: DecisionsOptionProCon[];
}

/**
 * Full decision response with all nested data
 * Response for GET /api/decisions/:id
 */
export interface DecisionResponse extends DecisionsDecision {
  /** Options with their pros/cons */
  options: DecisionOptionWithProsCons[];
  /** Outcome if recorded */
  outcome?: DecisionsDecisionOutcome | null;
  /** Follow-up reminders */
  reminders?: DecisionsFollowUpReminder[];
}

/**
 * Summary decision for list view (without full nested data)
 */
export interface DecisionSummary {
  /** Decision ID */
  id: string;
  /** Decision title */
  title: string;
  /** Brief description */
  description?: string;
  /** Current status */
  status: DecisionStatus;
  /** Category */
  category: DecisionCategory;
  /** Whether an outcome has been recorded */
  hasOutcome: boolean;
  /** Number of options */
  optionsCount: number;
  /** Timestamp when decided (if applicable) */
  decidedAt?: string;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

/**
 * Paginated list of decisions
 * Response for GET /api/decisions
 */
export interface DecisionListResponse extends PaginatedResponse<DecisionSummary> {}

// ============================================================================
// Outcome Request/Response Types
// ============================================================================

/**
 * Request body for recording a decision outcome
 * POST /api/decisions/:id/outcome
 */
export interface RecordOutcomeRequest {
  /** Rating of how the outcome compared to expectations */
  rating: OutcomeRating;
  /** Optional notes about the outcome */
  notes?: string;
  /** Optional URL to audio recording of outcome reflection */
  audioUrl?: string;
  /** Optional transcript of audio recording */
  transcript?: string;
}

/**
 * Request body for updating an existing outcome
 * PATCH /api/decisions/:id/outcome
 */
export interface UpdateOutcomeRequest {
  /** Updated rating */
  rating?: OutcomeRating;
  /** Updated notes */
  notes?: string;
  /** Updated audio URL */
  audioUrl?: string;
  /** Updated transcript */
  transcript?: string;
}

/**
 * Response for outcome endpoints
 */
export type OutcomeResponse = DecisionsDecisionOutcome;

// ============================================================================
// Reminder Request/Response Types
// ============================================================================

/**
 * Request body for creating a follow-up reminder
 * POST /api/decisions/:id/reminder
 */
export interface CreateReminderRequest {
  /** ISO date string for when the reminder should be sent */
  scheduledFor: string;
}

/**
 * Request body for updating a reminder
 * PATCH /api/reminders/:id
 */
export interface UpdateReminderRequest {
  /** Updated scheduled time */
  scheduledFor?: string;
  /** Mark as dismissed */
  isDismissed?: boolean;
}

/**
 * Response for reminder endpoints
 */
export type ReminderResponse = DecisionsFollowUpReminder;

/**
 * List of reminders
 */
export interface ReminderListResponse {
  items: DecisionsFollowUpReminder[];
}

// ============================================================================
// User Profile Request/Response Types
// ============================================================================

/**
 * Request body for creating a user profile
 * POST /api/users/profile
 */
export interface CreateProfileRequest {
  /** Display name for the user */
  displayName?: string;
}

/**
 * Request body for updating a user profile
 * PATCH /api/users/profile
 */
export interface UpdateProfileRequest {
  /** Updated display name */
  displayName?: string;
  /** Updated avatar URL */
  avatarUrl?: string;
  /** Mark onboarding as completed */
  onboardingCompleted?: boolean;
}

/**
 * User profile response
 */
export interface ProfileResponse {
  /** User ID */
  id: string;
  /** Display name */
  displayName?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Whether onboarding is completed */
  onboardingCompleted: boolean;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt: string;
}

// ============================================================================
// Stats Response Types
// ============================================================================

/**
 * Decision count by status
 */
export interface StatusCount {
  status: DecisionStatus;
  count: number;
}

/**
 * Decision count by category
 */
export interface CategoryCount {
  category: DecisionCategory;
  count: number;
}

/**
 * Outcome count by rating
 */
export interface OutcomeRatingCount {
  rating: OutcomeRating;
  count: number;
}

/**
 * Stats overview response
 * GET /api/stats/overview
 */
export interface StatsOverviewResponse {
  /** Total number of decisions */
  totalDecisions: number;
  /** Decision count by status */
  decisionsByStatus: StatusCount[];
  /** Decision count by category */
  decisionsByCategory: CategoryCount[];
  /** Outcome count by rating */
  outcomeBreakdown: OutcomeRatingCount[];
}

// ============================================================================
// Audio Upload Types
// ============================================================================

/**
 * Response for audio upload
 * POST /api/audio/upload
 */
export interface AudioUploadResponse {
  /** Public URL to the uploaded audio */
  url: string;
  /** Storage path for the file */
  path: string;
  /** File size in bytes */
  size: number;
}

// ============================================================================
// Transcription Types
// ============================================================================

/**
 * Request body for transcription
 * POST /api/transcription
 */
export interface TranscriptionRequest {
  /** URL of the audio file to transcribe */
  audioUrl?: string;
  /** Storage path of the audio file */
  audioPath?: string;
}

/**
 * Response for transcription
 */
export interface TranscriptionResponse {
  /** Transcribed text */
  text: string;
  /** Confidence score (0-1) */
  confidence: number;
}

// ============================================================================
// Extraction Types
// ============================================================================

/**
 * Extracted pro/con from AI
 */
export interface ExtractedProCon {
  content: string;
  isPro: boolean;
}

/**
 * Extracted option from AI
 */
export interface ExtractedOption {
  title: string;
  description?: string;
  pros: ExtractedProCon[];
  cons: ExtractedProCon[];
}

/**
 * Extracted decision data from AI
 * Response for POST /api/decisions/extract
 */
export interface ExtractedDecision {
  /** Extracted title */
  title: string;
  /** Suggested category */
  category: DecisionCategory;
  /** Detected emotional state */
  emotionalState?: string;
  /** Extracted options with pros/cons */
  options: ExtractedOption[];
}

/**
 * Request body for extraction
 * POST /api/decisions/extract
 */
export interface ExtractionRequest {
  /** Transcript text to extract from */
  transcript: string;
}
