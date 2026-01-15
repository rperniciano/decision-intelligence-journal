-- Migration: 002_enums
-- Description: Creates/updates ENUM types for decision status, outcome rating, and decision category
-- Created: 2026-01-15

-- decision_status ENUM type
-- Represents the lifecycle state of a decision
-- Note: The enum may already exist with partial values, so we create if not exists
-- and add missing values if it does exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'decision_status') THEN
    CREATE TYPE decision_status AS ENUM (
      'draft',
      'in_progress',
      'decided',
      'outcome_recorded'
    );
  END IF;
END$$;

-- Add missing values to decision_status if they don't exist
-- Using IF NOT EXISTS requires PostgreSQL 9.3+
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'in_progress';
ALTER TYPE decision_status ADD VALUE IF NOT EXISTS 'outcome_recorded';

COMMENT ON TYPE decision_status IS 'Status of a decision: draft (initial), in_progress (being considered), decided (choice made), outcome_recorded (result tracked)';

-- outcome_rating ENUM type
-- Represents how the outcome compared to expectations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'outcome_rating') THEN
    CREATE TYPE outcome_rating AS ENUM (
      'better_than_expected',
      'as_expected',
      'worse_than_expected'
    );
  END IF;
END$$;

COMMENT ON TYPE outcome_rating IS 'Rating of decision outcome: better_than_expected, as_expected, worse_than_expected';

-- decision_category ENUM type
-- Represents the category/domain of a decision
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'decision_category') THEN
    CREATE TYPE decision_category AS ENUM (
      'career',
      'financial',
      'relationship',
      'health',
      'lifestyle',
      'other'
    );
  END IF;
END$$;

COMMENT ON TYPE decision_category IS 'Category of decision: career, financial, relationship, health, lifestyle, other';
