-- Complete Unread System Setup (run in Supabase SQL Editor)
-- This handles all edge cases including if tables already exist

-- 1. Create chat_participants table if not exists
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_message_id UUID,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON public.chat_participants(chat_id);

-- 3. Enable Row Level Security
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Users can view own chat participants" ON public.chat_participants;
CREATE POLICY "Users can view own chat participants" ON public.chat_participants 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat participants" ON public.chat_participants;
CREATE POLICY "Users can update own chat participants" ON public.chat_participants 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat participants" ON public.chat_participants;
CREATE POLICY "Users can insert own chat participants" ON public.chat_participants 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Add realtime (ignore if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;

-- 6. Grant permissions
GRANT ALL ON public.chat_participants TO authenticated;
GRANT ALL ON public.chat_participants TO anon;

-- 7. Create helper function to get or create participant
CREATE OR REPLACE FUNCTION public.get_or_create_participant(
  p_chat_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  participant_id UUID;
BEGIN
  -- Try to get existing
  SELECT id INTO participant_id
  FROM chat_participants
  WHERE chat_id = p_chat_id AND user_id = p_user_id;
  
  -- Create if not exists
  IF participant_id IS NULL THEN
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (p_chat_id, p_user_id)
    ON CONFLICT (chat_id, user_id) DO NOTHING
    RETURNING id INTO participant_id;
    
    SELECT id INTO participant_id
    FROM chat_participants
    WHERE chat_id = p_chat_id AND user_id = p_user_id;
  END IF;
  
  RETURN participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_or_create_participant TO authenticated;

-- 8. Create function to mark messages as seen
CREATE OR REPLACE FUNCTION public.mark_messages_as_seen(
  p_chat_id UUID,
  p_user_id UUID,
  p_last_read_message_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Update participant's last read message
  UPDATE chat_participants
  SET 
    last_read_message_id = p_last_read_message_id,
    unread_count = 0,
    updated_at = NOW()
  WHERE chat_id = p_chat_id AND user_id = p_user_id;
  
  -- Mark messages as read
  UPDATE messages
  SET read_at = NOW(), status = 'seen'
  WHERE sender_id = p_chat_id 
    AND receiver_id = p_user_id 
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.mark_messages_as_seen TO authenticated;

-- Verify setup
SELECT 'Setup complete!' as status;

