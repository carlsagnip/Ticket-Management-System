-- =====================================================
-- FIX FOR REMARKS (COMMENTS) RLS POLICIES
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop existing restrictive policies on ticket_comments
DROP POLICY IF EXISTS "Admins can view all comments" ON ticket_comments;
DROP POLICY IF EXISTS "Admins can insert comments" ON ticket_comments;
DROP POLICY IF EXISTS "public_select_comments" ON ticket_comments;
DROP POLICY IF EXISTS "public_insert_comments" ON ticket_comments;

-- Step 2: Create NEW policies for PUBLIC access

-- Allow ANYONE (anon + authenticated) to VIEW comments
CREATE POLICY "public_select_comments"
  ON ticket_comments
  FOR SELECT
  USING (true);

-- Allow ANYONE (anon + authenticated) to ADD comments
CREATE POLICY "public_insert_comments"
  ON ticket_comments
  FOR INSERT
  WITH CHECK (true);

-- Step 3: Verify policies
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'ticket_comments'
ORDER BY policyname;

-- Note: The 'author_name' validation logic is handled in the frontend (RemarksSection.jsx)
-- but having RLS allow insert is safe enough for this use case if we want public comments.
