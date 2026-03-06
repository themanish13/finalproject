-- =====================================================
-- Simple Unread Message System Schema
-- Copy and paste this into Supabase SQL Editor
-- =====================================================

-- Create chat_participants table
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

-- Add index
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;

-- Enable RLS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own chat participants" ON public.chat_participants;
CREATE POLICY "Users can view own chat participants" ON public.chat_participants
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own chat participants" ON public.chat_participants;
CREATE POLICY "Users can update own chat participants" ON public.chat_participants
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat participants" ON public.chat_participants;
CREATE POLICY "Users can insert own chat participants" ON public.chat_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

