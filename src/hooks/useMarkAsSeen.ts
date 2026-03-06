import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore, ChatMessage } from '@/store/chatStore';

interface UseMarkAsSeenOptions {
  chatId: string;
  currentUserId: string;
}

/**
 * Hook to handle marking messages as seen when user opens a chat
 * This provides instant UI updates without page reload
 */
export const useMarkAsSeen = ({ chatId, currentUserId }: UseMarkAsSeenOptions) => {
  const { 
    messages, 
    updateMessage, 
    markAllMessagesAsSeen: markAllAsSeenInStore,
    setUnreadCount,
    clearUnreadCount,
  } = useChatStore();

  // Mark all messages from the other user as seen
  const markAllAsSeen = useCallback(async () => {
    if (!chatId || !currentUserId) return;

    console.log('[MarkAsSeen] Marking all messages as seen for chat:', chatId);

    // 1. INSTANT UI UPDATE - Update local state immediately
    const messagesToMarkAsSeen = messages.filter(
      m => m.sender_id === chatId && 
           m.receiver_id === currentUserId && 
           !m.read_at &&
           m.status !== 'seen'
    );

    console.log('[MarkAsSeen] Messages to mark as seen:', messagesToMarkAsSeen.length);

    // Update each message in local store
    messagesToMarkAsSeen.forEach(msg => {
      updateMessage(msg.id, { 
        status: 'seen', 
        read_at: new Date().toISOString() 
      });
    });

    // Also update via the store action
    markAllAsSeenInStore();

    // 2. Clear unread count for this chat (instant UI)
    clearUnreadCount(chatId);

    // 3. Get the latest message ID to track read position
    const latestMessage = messagesToMarkAsSeen.length > 0 
      ? messagesToMarkAsSeen.reduce((latest, msg) => 
          new Date(msg.created_at) > new Date(latest.created_at) ? msg : latest
        )
      : null;

    const lastReadMessageId = latestMessage?.id;

    // 4. DATABASE UPDATE - Update in Supabase
    try {
      // Update messages table
      const { error: updateError } = await supabase
        .from('messages')
        .update({ 
          status: 'seen',
          read_at: new Date().toISOString(),
        })
        .eq('sender_id', chatId)
        .eq('receiver_id', currentUserId)
        .is('read_at', null);

      if (updateError) {
        console.error('[MarkAsSeen] Error updating messages:', updateError);
      }

      // Try to update chat_participants table (will fail gracefully if not exists)
      if (lastReadMessageId) {
        try {
          await supabase
            .from('chat_participants')
            .upsert({
              chat_id: chatId,
              user_id: currentUserId,
              last_read_message_id: lastReadMessageId,
              unread_count: 0,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'chat_id,user_id',
            });
        } catch (err) {
          // Table might not exist yet, that's okay
          console.log('[MarkAsSeen] chat_participants update skipped:', err);
        }
      }

      console.log('[MarkAsSeen] Successfully marked as seen in database');
    } catch (err) {
      console.error('[MarkAsSeen] Error:', err);
    }

    // 5. Notify the sender that messages were seen (via realtime)
    try {
      // Send a broadcast to the other user
      const channel = supabase.channel(`seen-notification:${chatId}`);
      await channel.send({
        type: 'broadcast',
        event: 'messages_seen',
        payload: {
          chatId,
          readerId: currentUserId,
          lastReadMessageId,
          seenAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      // Realtime notification failed, but that's okay
      console.log('[MarkAsSeen] Realtime notification failed:', err);
    }
  }, [chatId, currentUserId, messages, updateMessage, markAllAsSeenInStore, clearUnreadCount]);

  // Mark a single message as seen (when user scrolls to it)
  const markAsSeen = useCallback(async (messageId: string) => {
    if (!chatId || !currentUserId || !messageId) return;

    console.log('[MarkAsSeen] Marking single message as seen:', messageId);

    // 1. Instant UI update
    updateMessage(messageId, { 
      status: 'seen', 
      read_at: new Date().toISOString() 
    });

    // 2. Database update
    try {
      await supabase
        .from('messages')
        .update({ 
          status: 'seen',
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId);
    } catch (err) {
      console.error('[MarkAsSeen] Error updating single message:', err);
    }
  }, [chatId, currentUserId, updateMessage]);

  // Check if there are any unseen messages
  const hasUnseenMessages = messages.some(
    m => m.sender_id === chatId && 
         m.receiver_id === currentUserId && 
         !m.read_at
  );

  // Get count of unseen messages
  const unseenCount = messages.filter(
    m => m.sender_id === chatId && 
         m.receiver_id === currentUserId && 
         !m.read_at
  ).length;

  return {
    markAsSeen,
    markAllAsSeen,
    hasUnseenMessages,
    unseenCount,
  };
};

