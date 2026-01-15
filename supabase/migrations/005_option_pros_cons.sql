-- Migration: 005_option_pros_cons
-- Description: Creates the DecisionsOptionProsCons table for pros and cons of decision options
-- Created: 2026-01-15

-- Create DecisionsOptionProsCons table
CREATE TABLE IF NOT EXISTS "DecisionsOptionProsCons" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES "DecisionsDecisionOptions"(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pro BOOLEAN NOT NULL,
  weight INTEGER DEFAULT 1 NOT NULL CHECK (weight >= 1 AND weight <= 5),
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table comment
COMMENT ON TABLE "DecisionsOptionProsCons" IS 'Pros and cons for each decision option in Decision Intelligence Journal app';

-- Create index on option_id for efficient joins
CREATE INDEX IF NOT EXISTS idx_decisions_option_pros_cons_option_id
  ON "DecisionsOptionProsCons"(option_id);

-- Enable Row Level Security
ALTER TABLE "DecisionsOptionProsCons" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT pros/cons for options belonging to their own decisions
-- Uses a two-level subquery to check ownership through option -> decision -> user chain
CREATE POLICY "Users can view pros_cons for their own decisions"
  ON "DecisionsOptionProsCons"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisionOptions" o
      INNER JOIN "DecisionsDecisions" d ON d.id = o.decision_id
      WHERE o.id = option_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can INSERT pros/cons for options belonging to their own decisions
CREATE POLICY "Users can create pros_cons for their own decisions"
  ON "DecisionsOptionProsCons"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisionOptions" o
      INNER JOIN "DecisionsDecisions" d ON d.id = o.decision_id
      WHERE o.id = option_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can UPDATE pros/cons for options belonging to their own decisions
CREATE POLICY "Users can update pros_cons for their own decisions"
  ON "DecisionsOptionProsCons"
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisionOptions" o
      INNER JOIN "DecisionsDecisions" d ON d.id = o.decision_id
      WHERE o.id = option_id
      AND d.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisionOptions" o
      INNER JOIN "DecisionsDecisions" d ON d.id = o.decision_id
      WHERE o.id = option_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- RLS Policy: Users can DELETE pros/cons for options belonging to their own decisions
CREATE POLICY "Users can delete pros_cons for their own decisions"
  ON "DecisionsOptionProsCons"
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "DecisionsDecisionOptions" o
      INNER JOIN "DecisionsDecisions" d ON d.id = o.decision_id
      WHERE o.id = option_id
      AND d.user_id = (SELECT auth.uid())
    )
  );

-- Create trigger for automatic updated_at
-- Note: update_updated_at_column function was created in 001_users_profile.sql
CREATE TRIGGER update_decisions_option_pros_cons_updated_at
  BEFORE UPDATE ON "DecisionsOptionProsCons"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
