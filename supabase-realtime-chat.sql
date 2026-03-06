-- =====================================================
-- Real-time Chat Schema Updates
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- Step 1: Add message status column
-- Status values: 'sent', 'delivered', 'seen'
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'sent'::character varying;

-- Step 2: Add delivery timestamp
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Add seen timestamp (keep read_at for compatibility)
-- We'll use read_at as "seen" timestamp

-- Step 4: Add indexes for efficient status queries
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON public.messages(delivered_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver_status 
ON public.messages(sender_id, receiver_id, status);

-- Step 5: Enable realtime for messages table (critical!)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;

-- Step 6: Create trigger function to auto-set status
CREATE OR REPLACE FUNCTION public.handle_message_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Set initial status to sent when message is created
  IF TG_OP = 'INSERT' THEN
    NEW.status := 'sent';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_message_status_on_insert ON public.messages;

-- Create trigger
CREATE TRIGGER set_message_status_on_insert
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_message_status();

-- Step 7: Create function to update message status (for delivery/seen)
CREATE OR REPLACE FUNCTION public.update_message_status(
  p_message_id UUID,
  p_status VARCHAR(20)
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.messages
  SET 
    status = p_status,
    delivered_at = CASE 
      WHEN p_status = 'delivered' AND delivered_at IS NULL 
      THEN NOW() 
      ELSE delivered_at 
    END,
    read_at = CASE 
      WHEN p_status = 'seen' AND read_at IS NULL 
      THEN NOW() 
      ELSE read_at 
    END
  WHERE id = p_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Grant permissions (adjust as needed for your security setup)
GRANT EXECUTE ON FUNCTION public.handle_message_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_message_status TO authenticated;

-- Step 9: Enable row-level security (if not already enabled)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only see their own messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
  );

-- Create policy for users to insert their own messages
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages" ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Create policy for users to update status of messages they sent/received
DROP POLICY IF EXISTS "Users can update message status" ON public.messages;
CREATE POLICY "Users can update message status" ON public.messages
  FOR UPDATE
  USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
  );

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if realtime is enabled
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check table structure
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'messages' ORDER BY ordinal_position;

