-- Migration: 001_users_profile
-- Description: Creates the DecisionsUserProfiles table for user profile data
-- Created: 2026-01-15

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create DecisionsUserProfiles table
CREATE TABLE IF NOT EXISTS "DecisionsUserProfiles" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add table comment
COMMENT ON TABLE "DecisionsUserProfiles" IS 'User profiles for Decision Intelligence Journal app';

-- Enable Row Level Security
ALTER TABLE "DecisionsUserProfiles" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can SELECT only their own profile
CREATE POLICY "Users can view their own profile"
  ON "DecisionsUserProfiles"
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- RLS Policy: Users can INSERT only their own profile
CREATE POLICY "Users can create their own profile"
  ON "DecisionsUserProfiles"
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- RLS Policy: Users can UPDATE only their own profile
CREATE POLICY "Users can update their own profile"
  ON "DecisionsUserProfiles"
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Create trigger for automatic updated_at
CREATE TRIGGER update_decisions_user_profiles_updated_at
  BEFORE UPDATE ON "DecisionsUserProfiles"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index on id for faster lookups (already primary key, but explicit)
CREATE INDEX IF NOT EXISTS idx_decisions_user_profiles_id
  ON "DecisionsUserProfiles"(id);
