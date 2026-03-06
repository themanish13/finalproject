-- Check if table exists and has correct structure
-- Run this to verify your setup

-- Check if chat_participants table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'chat_participants';

-- Check RLS status
SELECT relname, relrowsecurity FROM pg_class 
WHERE relname = 'chat_participants';

-- Check realtime is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

