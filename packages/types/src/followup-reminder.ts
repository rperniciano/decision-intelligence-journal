/**
 * Follow-up Reminder types for the DecisionsFollowUpReminders table
 * Maps to the database schema created in 007_followup_reminders.sql
 */

/**
 * Main FollowUpReminder entity
 * Represents a scheduled follow-up reminder for a decision in the DecisionsFollowUpReminders table
 * Used to remind users to check on their decision outcomes after a certain time
 */
export interface DecisionsFollowUpReminder {
  /** UUID primary key */
  id: string;
  /** Decision ID (references DecisionsDecisions) */
  decisionId: string;
  /** Timestamp when the reminder should be sent */
  scheduledFor: string;
  /** Timestamp when the reminder was actually sent (null if not yet sent) */
  sentAt: string | null;
  /** Whether the user has dismissed this reminder */
  isDismissed: boolean;
  /** Timestamp when the record was created */
  createdAt: string;
  /** Timestamp when the record was last updated */
  updatedAt: string;
}

/**
 * Input type for creating a new follow-up reminder
 * Omits auto-generated fields
 */
export type CreateDecisionsFollowUpReminderInput = Omit<
  DecisionsFollowUpReminder,
  'id' | 'sentAt' | 'isDismissed' | 'createdAt' | 'updatedAt'
> & {
  /** Optional: whether the reminder is dismissed (defaults to false) */
  isDismissed?: boolean;
};

/**
 * Input type for updating an existing follow-up reminder
 * All fields are optional except id
 * Note: decisionId cannot be changed after creation
 */
export type UpdateDecisionsFollowUpReminderInput = Partial<
  Omit<DecisionsFollowUpReminder, 'id' | 'decisionId' | 'createdAt' | 'updatedAt'>
>;

/**
 * Database row type (snake_case to match PostgreSQL conventions)
 * Used for direct database operations
 */
export interface DecisionsFollowUpReminderRow {
  id: string;
  decision_id: string;
  scheduled_for: string;
  sent_at: string | null;
  is_dismissed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Converts a database row to a FollowUpReminder entity
 */
export function toDecisionsFollowUpReminder(
  row: DecisionsFollowUpReminderRow
): DecisionsFollowUpReminder {
  return {
    id: row.id,
    decisionId: row.decision_id,
    scheduledFor: row.scheduled_for,
    sentAt: row.sent_at,
    isDismissed: row.is_dismissed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Converts a FollowUpReminder entity to a database row for insertion
 */
export function toDecisionsFollowUpReminderRow(
  reminder: Omit<DecisionsFollowUpReminder, 'id' | 'createdAt' | 'updatedAt'>
): Omit<DecisionsFollowUpReminderRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    decision_id: reminder.decisionId,
    scheduled_for: reminder.scheduledFor,
    sent_at: reminder.sentAt,
    is_dismissed: reminder.isDismissed,
  };
}
