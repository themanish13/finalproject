import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore, UnreadCountsMap } from '@/store/chatStore';
import type { ChatParticipant } from '@/types/chat';

interface UseUnreadCountsOptions {
  userId: string;
  enabled?: boolean;
}

/**
 * Hook to manage unread message counts for all conversations
 * This provides efficient, real-time unread counts using the chat_participants table
 */
export const useUnreadCounts = ({ userId, enabled = true }: UseUnreadCountsOptions) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isInitializedRef = useRef(false);
  
  const {
    unreadCounts,
    setUnreadCount,
    incrementUnreadCount,
    clearUnreadCount,
    setAllUnreadCounts,
  } = useChatStore();

  // Fetch initial unread counts from chat_participants table
  const fetchUnreadCounts = useCallback(async () => {
    if (!userId || !enabled) return;

    console.log('[UnreadCounts] Fetching initial unread counts...');

    try {
      // Try to get from chat_participants table
      const { data: participants, error } = await supabase
        .from('chat_participants')
        .select('chat_id, unread_count, last_read_message_id')
        .eq('user_id', userId);

      if (error) {
        console.warn('[UnreadCounts] Error fetching from chat_participants:', error.message);
        // Fall back to calculating from messages table
        await calculateUnreadFromMessages();
        return;
      }

      if (participants && participants.length > 0) {
        const counts: UnreadCountsMap = {};
        participants.forEach((p: ChatParticipant) => {
          counts[p.chat_id] = p.unread_count || 0;
        });
        console.log('[UnreadCounts] Loaded from chat_participants:', counts);
        setAllUnreadCounts(counts);
      } else {
        // No participants yet, calculate from messages
        console.log('[UnreadCounts] No participants found, calculating from messages');
        await calculateUnreadFromMessages();
      }
    } catch (err) {
      console.error('[UnreadCounts] Error:', err);
      // Fall back to message-based calculation
      await calculateUnreadFromMessages();
    }
  }, [userId, enabled, setAllUnreadCounts]);

  // Fallback: Calculate unread from messages table
  const calculateUnreadFromMessages = useCallback(async () => {
    if (!userId) return;

    console.log('[UnreadCounts] Calculating unread from messages table...');

    try {
      // Get all messages where user is receiver and not read
      const { data: messages, error } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, id, read_at')
        .eq('receiver_id', userId)
        .is('read_at', null)
        .is('is_unsent', null);

      if (error) {
        console.error('[UnreadCounts] Error calculating from messages:', error);
        return;
      }

      // Group by sender to get counts per conversation
      const counts: UnreadCountsMap = {};
      if (messages) {
        messages.forEach((msg) => {
          const chatId = msg.sender_id;
          counts[chatId] = (counts[chatId] || 0) + 1;
        });
      }

      console.log('[UnreadCounts] Calculated counts:', counts);
      setAllUnreadCounts(counts);
    } catch (err) {
      console.error('[UnreadCounts] Error:', err);
    }
  }, [userId, setAllUnreadCounts]);

  // Subscribe to realtime updates for chat_participants
  const subscribeToRealtime = useCallback(() => {
    if (!userId || isInitializedRef.current) return;

    console.log('[UnreadCounts] Subscribing to realtime updates...');
    isInitializedRef.current = true;

    // Create a channel for listening to unread count changes
    const channel = supabase.channel(`unread-counts:${userId}`, {
      config: {
        presence: { key: userId },
      },
    });

    // Listen for INSERT (new conversation participant)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_participants',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const newParticipant = payload.new as ChatParticipant;
        console.log('[UnreadCounts] New participant:', newParticipant);
        setUnreadCount(newParticipant.chat_id, newParticipant.unread_count || 0);
      }
    );

    // Listen for UPDATE (unread count changed)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chat_participants',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const updated = payload.new as ChatParticipant;
        console.log('[UnreadCounts] Participant updated:', updated);
        
        if (updated.unread_count !== undefined) {
          setUnreadCount(updated.chat_id, updated.unread_count);
        }
      }
    );

    // Also listen for new messages to increment unread count
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const newMessage = payload.new as any;
        
        // Only process messages sent TO the current user
        if (newMessage.receiver_id === userId) {
          console.log('[UnreadCounts] New message received:', newMessage.id);
          
          // Check if this is from an existing conversation
          const currentCount = unreadCounts[newMessage.sender_id] || 0;
          
          // Optimistically update the count
          setUnreadCount(newMessage.sender_id, currentCount + 1);
        }
      }
    );

    // Subscribe
    channel.subscribe((status) => {
      console.log('[UnreadCounts] Subscription status:', status);
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('[UnreadCounts] Unsubscribing from realtime...');
      isInitializedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, unreadCounts, setUnreadCount]);

  // Initialize
  useEffect(() => {
    if (!enabled || !userId) return;

    fetchUnreadCounts();
    const cleanup = subscribeToRealtime();

    return () => {
      cleanup?.();
    };
  }, [userId, enabled, fetchUnreadCounts, subscribeToRealtime]);

  // Get total unread count
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  // Get unread for specific chat
  const getUnreadForChat = useCallback((chatId: string) => {
    return unreadCounts[chatId] || 0;
  }, [unreadCounts]);

  // Manually refresh unread counts
  const refresh = useCallback(async () => {
    await fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Clear unread for a specific chat
  const markChatAsRead = useCallback(async (chatId: string) => {
    if (!userId) return;

    console.log('[UnreadCounts] Marking chat as read:', chatId);

    // Optimistically update local state
    clearUnreadCount(chatId);

    // Try to update via RPC (will fail gracefully if table doesn't exist yet)
    try {
      // Get the latest message ID in this conversation to set as last read
      const { data: latestMessage } = await supabase
        .from('messages')
        .select('id')
        .or(`and(sender_id.eq.${chatId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${chatId})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (latestMessage) {
        // Try to update via chat_participants table
        await supabase
          .from('chat_participants')
          .upsert({
            chat_id: chatId,
            user_id: userId,
            last_read_message_id: latestMessage.id,
            unread_count: 0,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'chat_id,user_id',
          });
      }
    } catch (err) {
      console.warn('[UnreadCounts] Could not update chat_participants:', err);
    }

    // Also update messages directly
    try {
      await supabase
        .from('messages')
        .update({ 
          status: 'seen',
          read_at: new Date().toISOString() 
        })
        .eq('sender_id', chatId)
        .eq('receiver_id', userId)
        .is('read_at', null);
    } catch (err) {
      console.warn('[UnreadCounts] Could not update messages:', err);
    }
  }, [userId, clearUnreadCount]);

  return {
    unreadCounts,
    totalUnread,
    getUnreadForChat,
    markChatAsRead,
    refresh,
  };
};

