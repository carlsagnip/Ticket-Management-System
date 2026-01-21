-- =====================================================
-- Create 'ticket-attachments' Storage Bucket via SQL
-- =====================================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (if not already enabled)
-- Note: Supabase Storage usually allows this, but policies are needed.

-- 3. Create Policies

-- Allow public access to view files (needed for the "Attachment" view in UI)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ticket-attachments' );

-- Allow authenticated users (Admins) to upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete files (for the "Remove" button)
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update files (optional, but good for replacing)
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ticket-attachments' 
  AND auth.role() = 'authenticated'
);
