-- Migration: 007_followup_reminders
-- Description: Creates the DecisionsFollowUpReminders table for scheduling follow-up reminders
-- Created: 2026-01-15

-- Create DecisionsFollowUpReminders table
CREATE TABLE IF NOT EXISTS "DecisionsFollowUpReminders" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES "DecisionsDecisions"(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table comment
COMMENT ON TABLE "DecisionsFollowUpReminders" IS 'Follow-up reminders for decisions in Decision Intelligence Journal app. Users can schedule reminders to check on their decision outcomes.';

-- Create indexes for efficient queries
-- Index on decision_id for filtering reminders by decision
CREATE INDEX idx_decisions_followup_reminders_decision_id ON "DecisionsFollowUpReminders"(decision_id);

-- Index on scheduled_for for finding upcoming reminders
CREATE INDEX idx_decisions_followup_reminders_scheduled_for ON "DecisionsFollowUpReminders"(scheduled_for);

-- Index on sent_at for finding unsent reminders (NULL values)
CREATE INDEX idx_decisions_followup_reminders_sent_at ON "DecisionsFollowUpReminders"(sent_at);

-- Enable Row Level Security
ALTER TABLE "DecisionsFollowUpReminders" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT reminders for their own decisions
CREATE POLICY "Users can view reminders for their own decisions"
  ON "DecisionsFollowUpReminders"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisions" d
      WHERE d.id = decision_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can INSERT reminders for their own decisions
CREATE POLICY "Users can create reminders for their own decisions"
  ON "DecisionsFollowUpReminders"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisions" d
      WHERE d.id = decision_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can UPDATE reminders for their own decisions
CREATE POLICY "Users can update reminders for their own decisions"
  ON "DecisionsFollowUpReminders"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisions" d
      WHERE d.id = decision_id
      AND d.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisions" d
      WHERE d.id = decision_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can DELETE reminders for their own decisions
CREATE POLICY "Users can delete reminders for their own decisions"
  ON "DecisionsFollowUpReminders"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisions" d
      WHERE d.id = decision_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- Create trigger for automatic updated_at
-- Note: update_updated_at_column function was created in 001_users_profile.sql
CREATE TRIGGER update_decisions_followup_reminders_updated_at
  BEFORE UPDATE ON "DecisionsFollowUpReminders"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
