-- Fix for Ticket Submission RLS Error
-- This allows anonymous users (public) to submit tickets

-- First, enable RLS on tickets table if not already enabled
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies (optional - run if you have old policies)
DROP POLICY IF EXISTS "Allow public ticket submission" ON tickets;

-- Create policy to allow anyone to INSERT tickets
CREATE POLICY "Allow public ticket submission"
ON tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also allow public to read their own tickets (optional but recommended)
DROP POLICY IF EXISTS "Allow public to read tickets" ON tickets;
CREATE POLICY "Allow public to read tickets"
ON tickets
FOR SELECT
TO anon, authenticated
USING (true);

-- IMPORTANT: Run this in your Supabase SQL Editor
-- After running, try submitting a ticket again
