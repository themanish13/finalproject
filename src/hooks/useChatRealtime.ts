import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore, ChatMessage } from '@/store/chatStore';
import type { MessageStatus } from '@/types/chat';

interface UseChatRealtimeOptions {
  chatId: string;
  currentUserId: string;
  onMessageReceived?: (message: ChatMessage) => void;
  onMessageUpdated?: (message: ChatMessage) => void;
  onMessageDeleted?: (messageId: string) => void;
}

interface RealtimeChannel {
  channel: ReturnType<typeof supabase.channel>;
  isSubscribed: boolean;
}

export const useChatRealtime = ({ 
  chatId, 
  currentUserId, 
  onMessageReceived,
  onMessageUpdated,
  onMessageDeleted 
}: UseChatRealtimeOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSyncTimeRef = useRef<string>(new Date().toISOString());
  const isInitializedRef = useRef(false);
  
  const {
    addMessage,
    updateMessage,
    removeMessage,
    setLoading,
    messages,
    setIsAtBottom,
    isAtBottom,
    markMessageAsDelivered,
    markMessageAsSeen,
  } = useChatStore();

  // Fetch missed messages after reconnection
  const fetchMissedMessages = useCallback(async () => {
    if (!chatId || !currentUserId) return;
    
    console.log('[Realtime] Fetching missed messages since:', lastSyncTimeRef.current);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${currentUserId})`)
        .gte('created_at', lastSyncTimeRef.current)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[Realtime] Error fetching missed messages:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log('[Realtime] Found missed messages:', data.length);
        
        // Get existing message IDs to avoid duplicates
        const existingIds = new Set(messages.map(m => m.id));
        
        data.forEach(msg => {
          if (!existingIds.has(msg.id)) {
            const parsed = parseMessage(msg);
            addMessage(parsed);
            
            // If this is a received message, mark as delivered
            if (msg.sender_id === chatId) {
              handleDeliveryReceipt(msg.id);
            }
          }
        });
      }
    } catch (err) {
      console.error('[Realtime] Error in fetchMissedMessages:', err);
    }
    
    lastSyncTimeRef.current = new Date().toISOString();
  }, [chatId, currentUserId, addMessage, messages]);

  // Parse message from database
  const parseMessage = (msg: any): ChatMessage => {
    let reactions: string[] = [];
    if (msg.reactions) {
      if (typeof msg.reactions === 'string') {
        try { reactions = JSON.parse(msg.reactions); } catch { reactions = []; }
      } else if (Array.isArray(msg.reactions)) {
        reactions = msg.reactions;
      }
    }
    
    return {
      id: msg.id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.content,
      media_url: msg.media_url,
      media_type: msg.media_type,
      read_at: msg.read_at,
      created_at: msg.created_at,
      is_unsent: msg.is_unsent,
      reply_to_id: msg.reply_to_id,
      reactions,
      status: msg.status || 'sent',
      delivered_at: msg.delivered_at,
    };
  };

  // Handle delivery receipt - notify server and update local state
  const handleDeliveryReceipt = useCallback(async (messageId: string) => {
    // Update local state
    markMessageAsDelivered(messageId);
    
    // Optionally notify server (if you have a server-side function)
    try {
      await supabase.rpc('update_message_status', {
        p_message_id: messageId,
        p_status: 'delivered'
      });
    } catch (error) {
      // Ignore RPC errors - local state is already updated
      console.log('[Realtime] Delivery receipt noted locally');
    }
  }, [markMessageAsDelivered]);

  // Handle seen receipt
  const handleSeenReceipt = useCallback(async (messageId: string) => {
    try {
      // Update local state
      markMessageAsSeen(messageId);
      
      // Update in database
      await supabase
        .from('messages')
        .update({ 
          status: 'seen',
          read_at: new Date().toISOString() 
        })
        .eq('id', messageId)
        .is('read_at', null);
    } catch (error) {
      console.error('[Realtime] Error marking message as seen:', error);
    }
  }, [markMessageAsSeen]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!chatId || !currentUserId || isInitializedRef.current) return;

    console.log('[Realtime] Subscribing to chat:', chatId);
    isInitializedRef.current = true;
    setLoading(true);

    // Create channel with proper config
    const channel = supabase.channel(`chat:${chatId}:${currentUserId}`, {
      config: {
        presence: { key: currentUserId },
      },
    });

    // Handle presence sync (for typing indicators and online status)
    channel.on('presence', { event: 'sync' }, () => {
      console.log('[Realtime] Presence sync');
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[Realtime] User joined:', key, newPresences);
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[Realtime] User left:', key, leftPresences);
    });

    // Handle new INSERT messages - received messages
    channel.on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
      },
      (payload) => {
        const newMsg = payload.new as any;
        console.log('[Realtime] New message received:', newMsg.id);
        
        // Only process messages for current chat (either sent or received)
        const isForCurrentChat = 
          (newMsg.sender_id === chatId && newMsg.receiver_id === currentUserId) ||
          (newMsg.sender_id === currentUserId && newMsg.receiver_id === chatId);
        
        if (!isForCurrentChat) return;
        
        // Don't add if already exists
        if (messages.some(m => m.id === newMsg.id)) return;
        
        const parsed = parseMessage(newMsg);
        
        // Add message to store
        addMessage(parsed);
        
        // If this is a received message (from other user), mark as delivered
        if (newMsg.sender_id === chatId) {
          handleDeliveryReceipt(newMsg.id);
        }
        
        // Callback
        onMessageReceived?.(parsed);
      }
    );

    // Handle UPDATE (unsent, reactions, read receipts, status)
    channel.on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages',
      },
      (payload) => {
        const updatedMsg = payload.new as any;
        console.log('[Realtime] Message updated:', updatedMsg.id);
        
        // Only process messages for current chat
        const isForCurrentChat = 
          (updatedMsg.sender_id === chatId && updatedMsg.receiver_id === currentUserId) ||
          (updatedMsg.sender_id === currentUserId && updatedMsg.receiver_id === chatId);
        
        if (!isForCurrentChat) return;
        
        // Handle unsent
        if (updatedMsg.is_unsent) {
          removeMessage(updatedMsg.id);
          onMessageDeleted?.(updatedMsg.id);
          return;
        }
        
        // Handle reactions
        if (updatedMsg.reactions !== undefined) {
          let reactions: string[] = [];
          if (typeof updatedMsg.reactions === 'string') {
            try { reactions = JSON.parse(updatedMsg.reactions); } catch { reactions = []; }
          } else if (Array.isArray(updatedMsg.reactions)) {
            reactions = updatedMsg.reactions;
          }
          updateMessage(updatedMsg.id, { reactions });
        }
        
        // Handle status changes (delivery/seen)
        if (updatedMsg.status) {
          updateMessage(updatedMsg.id, { 
            status: updatedMsg.status as MessageStatus,
            delivered_at: updatedMsg.delivered_at,
            read_at: updatedMsg.read_at,
          });
        }
        
        // Handle read_at changes
        if (updatedMsg.read_at && updatedMsg.sender_id === currentUserId) {
          // Our message was seen by the other user
          updateMessage(updatedMsg.id, { 
            status: 'seen',
            read_at: updatedMsg.read_at,
          });
        }
        
        onMessageUpdated?.(parseMessage(updatedMsg));
      }
    );

    // Handle DELETE (legacy - for hard deletes)
    channel.on(
      'postgres_changes',
      { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'messages',
      },
      (payload) => {
        console.log('[Realtime] Message deleted:', payload.old);
        if (payload.old?.id) {
          removeMessage(payload.old.id);
          onMessageDeleted?.(payload.old.id);
        }
      }
    );

    // Handle reconnection - fetch missed messages
    channel.on('system', { event: 'connected' }, () => {
      console.log('[Realtime] Connected, fetching missed messages...');
      fetchMissedMessages();
    });

    channel.on('system', { event: 'channel_error' }, (error) => {
      console.error('[Realtime] Channel error:', error);
    });

    // Subscribe
    channel.subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        setLoading(false);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Channel error, retrying...');
        setLoading(false);
      }
    });

    channelRef.current = { channel, isSubscribed: true };

    // Cleanup
    return () => {
      console.log('[Realtime] Unsubscribing from chat:', chatId);
      lastSyncTimeRef.current = new Date().toISOString();
      isInitializedRef.current = false;
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current.channel);
        channelRef.current = null;
      }
    };
  }, [chatId, currentUserId]);

  // Function to mark a message as seen (call from UI when user sees the message)
  const markAsSeen = useCallback(async (messageId: string) => {
    await handleSeenReceipt(messageId);
  }, [handleSeenReceipt]);

  // Function to mark all visible messages from other user as seen
  const markAllAsSeen = useCallback(async () => {
    const currentMessages = useChatStore.getState().messages;
    const unseenMessages = currentMessages.filter(
      m => m.sender_id === chatId && !m.read_at && m.status !== 'seen'
    );
    
    for (const msg of unseenMessages) {
      await handleSeenReceipt(msg.id);
    }
  }, [chatId, handleSeenReceipt]);

  // Update scroll position
  const handleScrollPosition = useCallback((isUserAtBottom: boolean) => {
    setIsAtBottom(isUserAtBottom);
  }, [setIsAtBottom]);

  return {
    markAsSeen,
    markAllAsSeen,
    fetchMissedMessages,
    handleScrollPosition,
  };
};

