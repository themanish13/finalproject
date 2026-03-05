-- =====================================================
-- Add Reactions Support to Messages Table
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- Add reactions column if not exists
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '[]'::jsonb;

-- Enable realtime for messages table (if not already enabled)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;

-- Create index for reactions queries
CREATE INDEX IF NOT EXISTS idx_messages_reactions 
ON public.messages(reactions) 
WHERE reactions IS NOT NULL AND reactions != '[]'::jsonb;

