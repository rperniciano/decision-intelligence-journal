-- Migration: 003_decisions
-- Description: Creates the DecisionsDecisions table for main decision records
-- Created: 2026-01-15

-- Create DecisionsDecisions table
CREATE TABLE IF NOT EXISTS "DecisionsDecisions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status decision_status DEFAULT 'draft' NOT NULL,
  category decision_category DEFAULT 'other' NOT NULL,
  emotional_state TEXT,
  audio_url TEXT,
  transcript TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table comment
COMMENT ON TABLE "DecisionsDecisions" IS 'Main decision records for Decision Intelligence Journal app';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_decisions_decisions_user_id
  ON "DecisionsDecisions"(user_id);

CREATE INDEX IF NOT EXISTS idx_decisions_decisions_status
  ON "DecisionsDecisions"(status);

CREATE INDEX IF NOT EXISTS idx_decisions_decisions_category
  ON "DecisionsDecisions"(category);

CREATE INDEX IF NOT EXISTS idx_decisions_decisions_created_at
  ON "DecisionsDecisions"(created_at DESC);

-- Enable Row Level Security
ALTER TABLE "DecisionsDecisions" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT only their own decisions
CREATE POLICY "Users can view their own decisions"
  ON "DecisionsDecisions"
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- RLS Policy: Users can INSERT only their own decisions
CREATE POLICY "Users can create their own decisions"
  ON "DecisionsDecisions"
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- RLS Policy: Users can UPDATE only their own decisions
CREATE POLICY "Users can update their own decisions"
  ON "DecisionsDecisions"
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- RLS Policy: Users can DELETE only their own decisions
CREATE POLICY "Users can delete their own decisions"
  ON "DecisionsDecisions"
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Create trigger for automatic updated_at
-- Note: update_updated_at_column function was created in 001_users_profile.sql
CREATE TRIGGER update_decisions_decisions_updated_at
  BEFORE UPDATE ON "DecisionsDecisions"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
