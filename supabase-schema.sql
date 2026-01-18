-- =====================================================
-- Ticketing Management System - Supabase Database Schema
-- =====================================================

-- 1. OFFICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TICKETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  office_id UUID REFERENCES offices(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. FUNCTION TO GENERATE TICKET IDs
-- =====================================================
-- This function generates sequential ticket IDs like TCKT-0001, TCKT-0002, etc.
CREATE OR REPLACE FUNCTION generate_ticket_id()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_ticket_id TEXT;
BEGIN
  -- Get the highest ticket number
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_id FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM tickets;
  
  -- Format as TCKT-XXXX
  new_ticket_id := 'TCKT-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN new_ticket_id;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER TO AUTO-GENERATE TICKET ID
-- =====================================================
CREATE OR REPLACE FUNCTION set_ticket_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_id IS NULL OR NEW.ticket_id = '' THEN
    NEW.ticket_id := generate_ticket_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_ticket_id
BEFORE INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION set_ticket_id();

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- OFFICES POLICIES
-- Allow public read for active offices (for ticket form dropdown)
CREATE POLICY "Public can view active offices"
  ON offices FOR SELECT
  USING (is_active = true);

-- Allow authenticated users (admins) full access
CREATE POLICY "Authenticated users full access to offices"
  ON offices FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- CATEGORIES POLICIES
-- Allow public read for active categories (for ticket form dropdown)
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  USING (is_active = true);

-- Allow authenticated users (admins) full access
CREATE POLICY "Authenticated users full access to categories"
  ON categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- TICKETS POLICIES
-- Allow public to insert tickets (guest submission)
CREATE POLICY "Public can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

-- Allow authenticated users (admins) to view all tickets
CREATE POLICY "Authenticated users can view all tickets"
  ON tickets FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users (admins) to update tickets
CREATE POLICY "Authenticated users can update tickets"
  ON tickets FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 7. INSERT SAMPLE DATA (Optional - for testing)
-- =====================================================
INSERT INTO offices (name) VALUES
  ('Head Office'),
  ('Sales Department'),
  ('IT Department'),
  ('Human Resources'),
  ('Finance Department')
ON CONFLICT (name) DO NOTHING;

INSERT INTO categories (name) VALUES
  ('Technical Support'),
  ('Billing Issue'),
  ('General Inquiry'),
  ('Feature Request'),
  ('Bug Report')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- INSTRUCTIONS:
-- =====================================================
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- 5. Verify tables were created in the Table Editor
--
-- For Storage (optional file attachments):
-- 1. Go to Storage section
-- 2. Create a new bucket called "ticket-attachments"
-- 3. Set it to public if you want attachments to be publicly accessible
-- =====================================================
