-- Create Comments Table and Policies

-- 1. Create table
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Allow authenticated users (admins) to do everything
CREATE POLICY "Admins can view all comments"
  ON ticket_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert comments"
  ON ticket_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Optional: Allow public to view comments if they have the ticket ID? 
-- For now, let's keep it private to admins as this is appearing in the "Ticket Details" modal which is admin-only.
