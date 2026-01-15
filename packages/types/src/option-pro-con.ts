/**
 * Option Pro/Con types for the DecisionsOptionProsCons table
 * Maps to the database schema created in 005_option_pros_cons.sql
 */

/**
 * Main OptionProCon entity
 * Represents a pro or con for a decision option in the DecisionsOptionProsCons table
 */
export interface DecisionsOptionProCon {
  /** UUID primary key */
  id: string;
  /** Option ID (references DecisionsDecisionOptions) */
  optionId: string;
  /** The pro/con content text */
  content: string;
  /** True for pro, false for con */
  isPro: boolean;
  /** Weight/importance of this pro/con (1-5) */
  weight: number;
  /** Order/position of this pro/con in the list */
  orderIndex: number;
  /** Timestamp when the record was created */
  createdAt: string;
  /** Timestamp when the record was last updated */
  updatedAt: string;
}

/**
 * Input type for creating a new option pro/con
 * Omits auto-generated fields
 */
export type CreateDecisionsOptionProConInput = Omit<
  DecisionsOptionProCon,
  'id' | 'createdAt' | 'updatedAt'
>;

/**
 * Input type for updating an existing option pro/con
 * All fields are optional except id
 */
export type UpdateDecisionsOptionProConInput = Partial<
  Omit<DecisionsOptionProCon, 'id' | 'optionId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Database row type (snake_case to match PostgreSQL conventions)
 * Used for direct database operations
 */
export interface DecisionsOptionProConRow {
  id: string;
  option_id: string;
  content: string;
  is_pro: boolean;
  weight: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

/**
 * Converts a database row to an OptionProCon entity
 */
export function toDecisionsOptionProCon(
  row: DecisionsOptionProConRow
): DecisionsOptionProCon {
  return {
    id: row.id,
    optionId: row.option_id,
    content: row.content,
    isPro: row.is_pro,
    weight: row.weight,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Converts an OptionProCon entity to a database row
 */
export function toDecisionsOptionProConRow(
  proCon: Omit<DecisionsOptionProCon, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DecisionsOptionProConRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    option_id: proCon.optionId,
    content: proCon.content,
    is_pro: proCon.isPro,
    weight: proCon.weight,
    order_index: proCon.orderIndex,
  };
}
