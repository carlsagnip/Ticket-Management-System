-- Run this in Supabase SQL Editor
-- Copy ALL 3 lines below and run together

DROP POLICY IF EXISTS "allow_anon_insert" ON tickets;
DROP POLICY IF EXISTS "Public can create tickets" ON tickets;
CREATE POLICY "allow_anon_insert" ON tickets FOR INSERT WITH CHECK (true);
