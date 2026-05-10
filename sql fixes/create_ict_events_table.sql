CREATE TABLE IF NOT EXISTS ict_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  person_in_charge TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL,
  event_end_date TIMESTAMPTZ,
  location TEXT,
  event_type TEXT,
  notes TEXT,
  checklist JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Run these ALTER statements if the table already exists:
ALTER TABLE ict_events ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMPTZ;
ALTER TABLE ict_events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE ict_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE ict_events ADD COLUMN IF NOT EXISTS notes TEXT;

-- Enable RLS
ALTER TABLE ict_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to do everything
CREATE POLICY "Authenticated users full access to ict_events"
  ON ict_events FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow public read just in case it's needed for a public facing dashboard later
CREATE POLICY "Public can view ict_events"
  ON ict_events FOR SELECT
  USING (true);
