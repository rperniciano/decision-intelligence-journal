-- Migration: 006_decision_outcomes
-- Description: Creates the DecisionsDecisionOutcomes table for recording decision outcomes
-- Created: 2026-01-15

-- Create DecisionsDecisionOutcomes table
CREATE TABLE IF NOT EXISTS "DecisionsDecisionOutcomes" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL UNIQUE REFERENCES "DecisionsDecisions"(id) ON DELETE CASCADE,
  rating outcome_rating NOT NULL,
  notes TEXT,
  audio_url TEXT,
  transcript TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table comment
COMMENT ON TABLE "DecisionsDecisionOutcomes" IS 'Outcomes for decisions in Decision Intelligence Journal app. Each decision has at most one outcome.';

-- Create index on decision_id for efficient lookups (UNIQUE already creates an index, but explicit for clarity)
-- Note: The UNIQUE constraint on decision_id already creates an implicit index

-- Enable Row Level Security
ALTER TABLE "DecisionsDecisionOutcomes" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT outcomes for their own decisions
CREATE POLICY "Users can view outcomes for their own decisions"
  ON "DecisionsDecisionOutcomes"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisions" d
      WHERE d.id = decision_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can INSERT outcomes for their own decisions
CREATE POLICY "Users can create outcomes for their own decisions"
  ON "DecisionsDecisionOutcomes"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisions" d
      WHERE d.id = decision_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can UPDATE outcomes for their own decisions
CREATE POLICY "Users can update outcomes for their own decisions"
  ON "DecisionsDecisionOutcomes"
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

-- RLS Policy: Users can DELETE outcomes for their own decisions
CREATE POLICY "Users can delete outcomes for their own decisions"
  ON "DecisionsDecisionOutcomes"
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
CREATE TRIGGER update_decisions_decision_outcomes_updated_at
  BEFORE UPDATE ON "DecisionsDecisionOutcomes"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
