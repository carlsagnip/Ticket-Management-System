-- =====================================================
-- COMPLETE FIX FOR RLS POLICIES
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop ALL existing policies on tickets table
DROP POLICY IF EXISTS "Public can create tickets" ON tickets;
DROP POLICY IF EXISTS "Allow public ticket creation" ON tickets;
DROP POLICY IF EXISTS "Authenticated users can view all tickets" ON tickets;
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON tickets;

-- Step 2: Create NEW policies with correct roles specified

-- Allow ANONYMOUS users (anon role) to INSERT tickets
CREATE POLICY "anon_insert_tickets"
  ON tickets
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow AUTHENTICATED users to INSERT tickets  
CREATE POLICY "auth_insert_tickets"
  ON tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow AUTHENTICATED users (admins) to view all tickets
CREATE POLICY "auth_select_tickets"
  ON tickets
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow AUTHENTICATED users (admins) to update tickets
CREATE POLICY "auth_update_tickets"
  ON tickets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 3: Verify RLS is enabled on tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Step 4: Check what policies exist now
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY policyname;

-- =====================================================
-- After running this, you should see 4 policies:
-- 1. anon_insert_tickets      (INSERT for anon)
-- 2. auth_insert_tickets      (INSERT for authenticated)
-- 3. auth_select_tickets      (SELECT for authenticated)
-- 4. auth_update_tickets      (UPDATE for authenticated)
-- =====================================================
