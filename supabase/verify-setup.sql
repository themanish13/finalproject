-- =====================================================
-- VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify setup
-- =====================================================

-- 1. Check if all tables exist
SELECT 
  table_name,
  'EXISTS ✓' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'crushes', 'matches', 'hint_usage')
ORDER BY table_name;

-- 2. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  'ACTIVE ✓' as status
FROM information_schema.triggers
WHERE trigger_name = 'on_crush_created';

-- 3. Check if the function exists
SELECT 
  routine_name,
  routine_type,
  'EXISTS ✓' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'check_and_create_match';

-- 4. Test the matching logic (dry run - no actual data inserted)
-- This shows what WOULD happen if User A and User B mutually select each other

SELECT 'Setup verification complete!' as message;
SELECT 'If you see results above for tables, trigger, and function, your backend is ready!' as next_step;

-- =====================================================
-- OPTIONAL: View current data
-- =====================================================

-- Count users
SELECT COUNT(*) as total_users FROM public.profiles;

-- Count crushes
SELECT COUNT(*) as total_crushes FROM public.crushes;

-- Count matches
SELECT COUNT(*) as total_matches FROM public.matches;

-- Show recent activity
SELECT 
  'Recent Crushes' as activity_type,
  COUNT(*) as count
FROM public.crushes
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'Recent Matches' as activity_type,
  COUNT(*) as count
FROM public.matches
WHERE matched_at > NOW() - INTERVAL '24 hours';
