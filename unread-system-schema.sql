-- =====================================================
-- Professional Unread Message System Schema
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- Step 1: Create chat_participants table for efficient unread tracking
-- This table tracks each user's read position in each conversation
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,  -- The other user's ID (since this is 1-on-1 chat)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_message_id UUID,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- Step 2: Add indexes for efficient unread queries
-- Index for getting all participants for a user
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id 
ON public.chat_participants(user_id);

-- Index for efficient unread count aggregation
CREATE INDEX IF NOT EXISTS idx_chat_participants_unread_count 
ON public.chat_participants(user_id) 
WHERE unread_count > 0;

-- Index for looking up a specific chat participant
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_user 
ON public.chat_participants(chat_id, user_id);

-- Step 3: Enable row-level security
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies for chat_participants

-- Policy: Users can view their own chat participants
DROP POLICY IF EXISTS "Users can view own chat participants" ON public.chat_participants;
CREATE POLICY "Users can view own chat participants" ON public.chat_participants
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own chat participant records
DROP POLICY IF EXISTS "Users can insert own chat participants" ON public.chat_participants;
CREATE POLICY "Users can insert own chat participants" ON public.chat_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chat participant records
DROP POLICY IF EXISTS "Users can update own chat participants" ON public.chat_participants;
CREATE POLICY "Users can update own chat participants" ON public.chat_participants
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 5: Enable realtime for chat_participants table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;

-- Step 6: Create function to initialize chat participant when first message is sent
CREATE OR REPLACE FUNCTION public.initialize_chat_participant(
  p_chat_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Insert or do nothing if already exists
  INSERT INTO public.chat_participants (chat_id, user_id, unread_count)
  VALUES (p_chat_id, p_user_id, 0)
  ON CONFLICT (chat_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to mark messages as seen and update last_read_message_id
CREATE OR REPLACE FUNCTION public.mark_messages_as_seen(
  p_chat_id UUID,
  p_user_id UUID,
  p_last_read_message_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  -- Update the participant's last read message ID
  UPDATE public.chat_participants
  SET 
    last_read_message_id = p_last_read_message_id,
    unread_count = 0,
    updated_at = NOW()
  WHERE chat_id = p_chat_id AND user_id = p_user_id;

  -- Get the count of messages we marked as seen
  GET DIAGNOSTICS updated_rows = ROW_COUNT;

  RETURN updated_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to increment unread count when new message arrives
CREATE OR REPLACE FUNCTION public.increment_unread_count(
  p_chat_id UUID,
  p_receiver_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.chat_participants
  SET 
    unread_count = unread_count + 1,
    updated_at = NOW()
  WHERE chat_id = p_chat_id AND user_id = p_receiver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger function to auto-handle new messages
CREATE OR REPLACE FUNCTION public.handle_new_message_for_unread()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a new message (not an update)
  IF TG_OP = 'INSERT' THEN
    -- Increment unread count for the receiver
    PERFORM public.increment_unread_count(NEW.receiver_id, NEW.receiver_id);
    
    -- Initialize participant records if they don't exist
    PERFORM public.initialize_chat_participant(NEW.sender_id, NEW.sender_id);
    PERFORM public.initialize_chat_participant(NEW.receiver_id, NEW.receiver_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create trigger for message insert
DROP TRIGGER IF EXISTS handle_new_message_unread ON public.messages;
CREATE TRIGGER handle_new_message_unread
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_for_unread();

-- Step 11: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.initialize_chat_participant TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_seen TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_unread_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_message_for_unread TO authenticated;

-- Step 12: Create helper view to get all unread counts for a user
CREATE OR REPLACE VIEW public.user_unread_counts AS
SELECT 
  cp.user_id,
  cp.chat_id,
  cp.unread_count,
  cp.last_read_message_id,
  cp.updated_at as last_updated
FROM public.chat_participants cp
WHERE cp.unread_count > 0;

-- =====================================================
-- Migration: Initialize existing conversations
-- Run this once to populate chat_participants for existing conversations
-- =====================================================
/*
INSERT INTO public.chat_participants (chat_id, user_id, unread_count)
SELECT 
  CASE 
    WHEN m.sender_id = m.receiver_id THEN m.receiver_id
    WHEN m.sender_id = auth.uid() THEN m.receiver_id
    ELSE m.sender_id
  END as chat_id,
  auth.uid() as user_id,
  0 as unread_count
FROM public.messages m
CROSS JOIN (SELECT id FROM auth.users) AS current_user
WHERE m.receiver_id = auth.uid() 
   OR m.sender_id = auth.uid()
ON CONFLICT (chat_id, user_id) DO NOTHING;
*/

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if realtime is enabled for chat_participants
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check chat_participants table structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'chat_participants' ORDER BY ordinal_position;

-- Check current unread counts for a user (replace USER_ID)
-- SELECT * FROM public.chat_participants WHERE user_id = 'USER_ID';

