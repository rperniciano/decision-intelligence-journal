-- Migration: 008_storage_bucket_audio.sql
-- Description: Create storage bucket for decision audio files with RLS policies
-- PRD: US-019 - Supabase Storage Bucket per Audio

-- Create the decision-audio bucket if it doesn't exist
-- The bucket is private (not public) to enforce RLS policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'decision-audio',
  'decision-audio',
  false,
  10485760, -- 10MB limit
  ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS Policy: Allow authenticated users to upload audio files to their own folder
-- Files must be stored in {user_id}/ folder structure
CREATE POLICY "Users can upload audio to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'decision-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- RLS Policy: Allow users to read only their own audio files
-- Users can only access files in their own folder
CREATE POLICY "Users can read own audio files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'decision-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- RLS Policy: Allow users to update their own audio files
-- Required for upsert functionality
CREATE POLICY "Users can update own audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'decision-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'decision-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- RLS Policy: Allow users to delete their own audio files
CREATE POLICY "Users can delete own audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'decision-audio'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);
