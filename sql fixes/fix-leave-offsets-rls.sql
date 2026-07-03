-- =====================================================
-- FIX RLS FOR leave_offsets TABLE
-- Run this script in the Supabase SQL Editor
-- =====================================================

-- Make sure RLS is enabled
ALTER TABLE leave_offsets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view leave offsets
CREATE POLICY "auth_select_leave_offsets"
  ON leave_offsets
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert leave offsets
CREATE POLICY "auth_insert_leave_offsets"
  ON leave_offsets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update leave offsets
CREATE POLICY "auth_update_leave_offsets"
  ON leave_offsets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete leave offsets
CREATE POLICY "auth_delete_leave_offsets"
  ON leave_offsets
  FOR DELETE
  TO authenticated
  USING (true);
