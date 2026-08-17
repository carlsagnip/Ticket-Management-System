-- =====================================================
-- Weekend Wheel Assignments Table
-- =====================================================
-- Stores which officers are assigned to which weekend wheel (main, sub, support)

CREATE TABLE IF NOT EXISTS weekend_wheel_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES officers(id) ON DELETE CASCADE,
  wheel_type TEXT NOT NULL CHECK (wheel_type IN ('main', 'sub', 'support')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(officer_id, wheel_type)
);

-- Enable RLS
ALTER TABLE weekend_wheel_assignments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users full access to weekend_wheel_assignments"
  ON weekend_wheel_assignments FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Allow public read access (for display purposes)
CREATE POLICY "Public can view weekend_wheel_assignments"
  ON weekend_wheel_assignments FOR SELECT
  USING (true);
