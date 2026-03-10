-- Add is_anonymous column to posts table if it doesn't exist
-- Run this in your Supabase SQL Editor

ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_is_anonymous ON posts(is_anonymous);

