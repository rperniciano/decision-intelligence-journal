-- Migration: 004_decision_options
-- Description: Creates the DecisionsDecisionOptions table for decision options
-- Created: 2026-01-15

-- Create DecisionsDecisionOptions table
CREATE TABLE IF NOT EXISTS "DecisionsDecisionOptions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES "DecisionsDecisions"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_chosen BOOLEAN DEFAULT FALSE NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table comment
COMMENT ON TABLE "DecisionsDecisionOptions" IS 'Options/alternatives for each decision in Decision Intelligence Journal app';

-- Create index on decision_id for efficient joins
CREATE INDEX IF NOT EXISTS idx_decisions_decision_options_decision_id
  ON "DecisionsDecisionOptions"(decision_id);

-- Enable Row Level Security
ALTER TABLE "DecisionsDecisionOptions" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT options for decisions they own
-- Uses a subquery to check ownership through the parent decision
CREATE POLICY "Users can view options for their own decisions"
  ON "DecisionsDecisionOptions"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisions" d
      WHERE d.id = decision_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can INSERT options for decisions they own
CREATE POLICY "Users can create options for their own decisions"
  ON "DecisionsDecisionOptions"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisions" d
      WHERE d.id = decision_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can UPDATE options for decisions they own
CREATE POLICY "Users can update options for their own decisions"
  ON "DecisionsDecisionOptions"
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

-- RLS Policy: Users can DELETE options for decisions they own
CREATE POLICY "Users can delete options for their own decisions"
  ON "DecisionsDecisionOptions"
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
CREATE TRIGGER update_decisions_decision_options_updated_at
  BEFORE UPDATE ON "DecisionsDecisionOptions"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
