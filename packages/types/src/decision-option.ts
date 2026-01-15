/**
 * Decision Option types for the DecisionsDecisionOptions table
 * Maps to the database schema created in 004_decision_options.sql
 */

/**
 * Main DecisionOption entity
 * Represents an option/alternative for a decision in the DecisionsDecisionOptions table
 */
export interface DecisionsDecisionOption {
  /** UUID primary key */
  id: string;
  /** Decision ID (references DecisionsDecisions) */
  decisionId: string;
  /** Option title (required) */
  title: string;
  /** Optional detailed description */
  description?: string;
  /** Whether this option was chosen */
  isChosen: boolean;
  /** Order/position of this option in the list */
  orderIndex: number;
  /** Timestamp when the record was created */
  createdAt: string;
  /** Timestamp when the record was last updated */
  updatedAt: string;
}

/**
 * Input type for creating a new decision option
 * Omits auto-generated fields
 */
export type CreateDecisionsDecisionOptionInput = Omit<
  DecisionsDecisionOption,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Input type for updating an existing decision option
 * All fields are optional except id
 */
export type UpdateDecisionsDecisionOptionInput = Partial<
  Omit<DecisionsDecisionOption, 'id' | 'decisionId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Database row type (snake_case to match PostgreSQL conventions)
 * Used for direct database operations
 */
export interface DecisionsDecisionOptionRow {
  id: string;
  decision_id: string;
  title: string;
  description: string | null;
  is_chosen: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * Converts a database row to a DecisionOption entity
 */
export function toDecisionsDecisionOption(
  row: DecisionsDecisionOptionRow
): DecisionsDecisionOption {
  return {
    id: row.id,
    decisionId: row.decision_id,
    title: row.title,
    description: row.description ?? undefined,
    isChosen: row.is_chosen,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Converts a DecisionOption entity to a database row
 */
export function toDecisionsDecisionOptionRow(
  option: Omit<DecisionsDecisionOption, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DecisionsDecisionOptionRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    decision_id: option.decisionId,
    title: option.title,
    description: option.description ?? null,
    is_chosen: option.isChosen,
    order_index: option.orderIndex,
  };
}
