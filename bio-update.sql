-- Add bio column to profiles table (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Remove class and batch columns from profiles (no longer needed)
ALTER TABLE profiles DROP COLUMN IF EXISTS class;
ALTER TABLE profiles DROP COLUMN IF EXISTS batch;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('bio', 'class', 'batch');

