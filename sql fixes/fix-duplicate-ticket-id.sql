-- Fix for Duplicate Ticket ID Error (Corrected Order)
-- This ensures ticket_id is automatically generated and unique

-- 1. Remove the NOT NULL constraint if it exists (so we can insert without ID initially)
ALTER TABLE tickets ALTER COLUMN ticket_id DROP NOT NULL;

-- 2. Create the helper function to generate the ID string
CREATE OR REPLACE FUNCTION generate_ticket_id()
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  max_num INTEGER;
BEGIN
  -- Get the highest number from existing ticket IDs
  -- Looks for pattern TCKT-XXXX
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_id FROM '\d+') AS INTEGER)), 0)
  INTO max_num
  FROM tickets
  WHERE ticket_id ~ 'TCKT-\d+';
  
  -- Generate new ID (increment max found)
  new_id := 'TCKT-' || LPAD((max_num + 1)::TEXT, 4, '0');
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger function (MUST BE DONE BEFORE THE TRIGGER)
CREATE OR REPLACE FUNCTION generate_ticket_id_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_id := generate_ticket_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create or replace the trigger
DROP TRIGGER IF EXISTS set_ticket_id ON tickets;

CREATE TRIGGER set_ticket_id
BEFORE INSERT ON tickets
FOR EACH ROW
WHEN (NEW.ticket_id IS NULL)
EXECUTE FUNCTION generate_ticket_id_trigger();

-- Run this in Supabase SQL Editor to fix the duplicate ticket ID issue
