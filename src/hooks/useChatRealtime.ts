import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore, ChatMessage } from '@/store/chatStore';

interface UseChatRealtimeOptions {
  chatId: string;
  currentUserId: string;
  onMessageReceived?: (message: ChatMessage) => void;
}

export const useChatRealtime = ({ chatId, currentUserId, onMessageReceived }: UseChatRealtimeOptions) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSyncTimeRef = useRef<string>(new Date().toISOString());
  
  const {
    addMessage,
    updateMessage,
    removeMessage,
    setLoading,
    messages,
  } = useChatStore();

  // Fetch missed messages (for reconnection)
  const fetchMissedMessages = useCallback(async () => {
    console.log('[Realtime] Fetching missed messages since:', lastSyncTimeRef.current);
    
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
      data.forEach(msg => {
        if (!messages.some(m => m.id === msg.id)) {
          addMessage(parseMessage(msg));
        }
      });
    }
    
    lastSyncTimeRef.current = new Date().toISOString();
  }, [chatId, currentUserId, addMessage, messages]);

  // Parse message from DB
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
    };
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!chatId || !currentUserId) return;

    console.log('[Realtime] Subscribing to chat:', chatId);
    setLoading(true);

    // Create channel
    const channel = supabase.channel(`chat:${chatId}`, {
      config: {
        presence: { key: currentUserId },
      },
    });

    // Handle presence sync (for typing indicators)
    channel.on('presence', { event: 'sync' }, () => {
      console.log('[Realtime] Presence sync');
    });

    // Handle new INSERT messages
    channel.on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${currentUserId}`,
      },
      (payload) => {
        console.log('[Realtime] New message received:', payload.new);
        const newMsg = payload.new as any;
        
        // Only add if from current chat
        if (newMsg.sender_id === chatId) {
          const parsed = parseMessage(newMsg);
          addMessage(parsed);
          
          // Mark as read
          markAsRead(newMsg.id);
          
          // Callback
          onMessageReceived?.(parsed);
        }
      }
    );

    // Handle UPDATE (unsent, reactions, read receipts)
    channel.on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages',
      },
      (payload) => {
        console.log('[Realtime] Message updated:', payload.new);
        const updatedMsg = payload.new as any;
        
        // Handle unsend
        if (updatedMsg.is_unsent) {
          removeMessage(updatedMsg.id);
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
        
        // Handle read receipts
        if (updatedMsg.read_at) {
          updateMessage(updatedMsg.id, { read_at: updatedMsg.read_at });
        }
      }
    );

    // Handle DELETE (legacy)
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
        }
      }
    );

    // Handle reconnection
    channel.on('system', { event: 'connected' }, () => {
      console.log('[Realtime] Connected, fetching missed messages...');
      fetchMissedMessages();
    });

    // Subscribe
    channel.subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        setLoading(false);
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('[Realtime] Unsubscribing from chat:', chatId);
      lastSyncTimeRef.current = new Date().toISOString();
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .is('read_at', null);
    } catch (error) {
      console.error('[Realtime] Error marking message as read:', error);
    }
  }, []);

  // Send acknowledgment (optional - for server to know client received)
  const sendAcknowledgment = useCallback(async (messageId: string) => {
    // Could be used for delivery receipts
    console.log('[Realtime] Message acknowledged:', messageId);
  }, []);

  return {
    markAsRead,
    sendAcknowledgment,
    fetchMissedMessages,
  };
};

