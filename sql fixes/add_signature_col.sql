-- Run this in your Supabase SQL Editor
-- This adds the signature column to store the base64 image data of the signature

ALTER TABLE repair_borrowed
ADD COLUMN IF NOT EXISTS signature TEXT;
