import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useChatStore, ChatMessage } from '@/store/chatStore';

interface UseInfiniteScrollOptions {
  chatId: string;
  currentUserId: string;
}

export const useInfiniteScroll = ({ chatId, currentUserId }: UseInfiniteScrollOptions) => {
  const loadingRef = useRef(false);
  
  const {
    messages,
    setLoadingMore,
    setHasMore,
    addMessages,
    isLoadingMore,
    hasMoreMessages,
  } = useChatStore();

  // Get the oldest message timestamp
  const getOldestMessageTime = useCallback(() => {
    if (messages.length === 0) return null;
    const oldest = messages.reduce((oldest, msg) => 
      new Date(msg.created_at) < new Date(oldest.created_at) ? msg : oldest
    );
    return oldest.created_at;
  }, [messages]);

  // Load older messages
  const loadMoreMessages = useCallback(async () => {
    if (!chatId || !currentUserId || loadingRef.current || !hasMoreMessages) {
      console.log('[InfiniteScroll] Skipping load:', { 
        hasChatId: !!chatId, 
        loading: loadingRef.current,
        hasMore: hasMoreMessages 
      });
      return;
    }

    loadingRef.current = true;
    setLoadingMore(true);

    const oldestTime = getOldestMessageTime();
    console.log('[InfiniteScroll] Loading messages older than:', oldestTime);

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${chatId}),and(sender_id.eq.${chatId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

      // If we have messages, load older ones
      if (oldestTime) {
        query = query.lt('created_at', oldestTime);
      }

      // Limit to 50 messages per page
      const { data, error } = await query.limit(50);

      if (error) {
        console.error('[InfiniteScroll] Error loading messages:', error);
        setLoadingMore(false);
        loadingRef.current = false;
        return;
      }

      if (data && data.length > 0) {
        console.log('[InfiniteScroll] Loaded older messages:', data.length);
        
        // Filter out unsent and deleted messages
        const validMessages: ChatMessage[] = data
          .filter((msg: any) => !msg.is_unsent && !msg.deleted_for_sender && !msg.deleted_for_receiver)
          .map((msg: any) => ({
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
            reactions: typeof msg.reactions === 'string' 
              ? JSON.parse(msg.reactions) 
              : msg.reactions || [],
          }));

        addMessages(validMessages);
        
        // If we got fewer than 50, there are no more messages
        if (data.length < 50) {
          setHasMore(false);
          console.log('[InfiniteScroll] No more messages to load');
        }
      } else {
        setHasMore(false);
        console.log('[InfiniteScroll] No more messages');
      }
    } catch (error) {
      console.error('[InfiniteScroll] Error:', error);
    } finally {
      setLoadingMore(false);
      loadingRef.current = false;
    }
  }, [chatId, currentUserId, getOldestMessageTime, addMessages, setLoadingMore, setHasMore, hasMoreMessages, messages]);

  // Check if should load more (scroll position)
  const checkAndLoadMore = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    // If user scrolls near top, load more
    const threshold = 100; // pixels from top
    if (scrollTop < threshold && !loadingRef.current && hasMoreMessages) {
      console.log('[InfiniteScroll] User scrolled near top, loading more...');
      loadMoreMessages();
    }
  }, [loadMoreMessages, hasMoreMessages]);

  return {
    loadMoreMessages,
    checkAndLoadMore,
    isLoadingMore,
    hasMoreMessages,
  };
};

