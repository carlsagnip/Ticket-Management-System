-- =====================================================
-- ENABLE RLS WITH PROPER SECURITY POLICIES
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Enable RLS on tickets table
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Step 2: Create policy for ANONYMOUS users to INSERT tickets
CREATE POLICY "anon_users_insert_tickets" 
ON tickets 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Step 3: Create policy for AUTHENTICATED users (admins) to view all tickets
CREATE POLICY "auth_users_select_tickets" 
ON tickets 
FOR SELECT 
TO authenticated
USING (true);

-- Step 4: Create policy for AUTHENTICATED users to update tickets
CREATE POLICY "auth_users_update_tickets" 
ON tickets 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Step 5: Verify policies were created
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename = 'tickets'
ORDER BY policyname;

-- =====================================================
-- RESULT: After running this, you should see 3 policies:
-- 1. anon_users_insert_tickets  (INSERT for anon role)
-- 2. auth_users_select_tickets  (SELECT for authenticated)
-- 3. auth_users_update_tickets  (UPDATE for authenticated)
-- 
-- Security Model:
-- ✓ Guests can submit tickets (INSERT only)
-- ✓ Admins can view all tickets (SELECT)
-- ✓ Admins can update tickets (UPDATE)
-- ✗ Guests CANNOT view or modify existing tickets
-- ✗ Unauthenticated users CANNOT access admin features
-- =====================================================
