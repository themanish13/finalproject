-- Complete Fix for Bio - Run this in Supabase SQL Editor

-- 1. Add bio column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Drop class and batch columns if they exist (will not error if they don't exist)
ALTER TABLE profiles DROP COLUMN IF EXISTS class;
ALTER TABLE profiles DROP COLUMN IF EXISTS batch;

-- 3. Verify the profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Check current data in profiles
SELECT id, name, bio, gender, avatar_url FROM profiles LIMIT 10;

