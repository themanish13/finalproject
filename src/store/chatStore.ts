import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  read_at?: string | null;
  created_at: string;
  is_unsent?: boolean;
  reply_to_id?: string | null;
  reply_to_content?: string;
  reactions?: string[];
  isPending?: boolean; // Optimistic UI
  isFailed?: boolean;  // Failed to send
}

interface ChatState {
  // State
  messages: ChatMessage[];
  currentChatId: string | null;
  currentUserId: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  lastReadMessageId: string | null;
  
  // Actions
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  addMessages: (messages: ChatMessage[]) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setCurrentChat: (chatId: string, userId: string) => void;
  clearChat: () => void;
  
  // Optimistic UI helpers
  addOptimisticMessage: (message: Omit<ChatMessage, 'id' | 'created_at' | 'isPending'>) => string;
  confirmMessage: (tempId: string, realId: string, createdAt: string) => void;
  failMessage: (tempId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  messages: [],
  currentChatId: null,
  currentUserId: null,
  isLoading: false,
  isLoadingMore: false,
  hasMoreMessages: true,
  lastReadMessageId: null,

  // Set all messages (replaces current state)
  setMessages: (messages) => set({ messages }),

  // Add single message (for realtime)
  addMessage: (message) => set((state) => {
    // Don't add if already exists
    if (state.messages.some(m => m.id === message.id)) {
      return state;
    }
    // Add to end (newest)
    return { messages: [...state.messages, message] };
  }),

  // Add multiple messages (for initial load or pagination)
  addMessages: (newMessages) => set((state) => {
    const existingIds = new Set(state.messages.map(m => m.id));
    const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
    return { messages: [...state.messages, ...uniqueNew] };
  }),

  // Update a message (for reactions, read receipts, etc.)
  updateMessage: (id, updates) => set((state) => ({
    messages: state.messages.map(m => 
      m.id === id ? { ...m, ...updates } : m
    )
  })),

  // Remove a message (for unsend, delete)
  removeMessage: (id) => set((state) => ({
    messages: state.messages.filter(m => m.id !== id)
  })),

  setLoading: (isLoading) => set({ isLoading }),
  setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setHasMore: (hasMoreMessages) => set({ hasMoreMessages: hasMoreMessages }),

  setCurrentChat: (chatId, userId) => set({
    currentChatId: chatId,
    currentUserId: userId,
  }),

  clearChat: () => set({
    messages: [],
    currentChatId: null,
    hasMoreMessages: true,
    lastReadMessageId: null,
  }),

  // Optimistic UI: Add message immediately
  addOptimisticMessage: (message) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: ChatMessage = {
      ...message,
      id: tempId,
      created_at: new Date().toISOString(),
      isPending: true,
    };
    
    set((state) => ({
      messages: [...state.messages, optimisticMessage]
    }));
    
    return tempId;
  },

  // Confirm message after server response
  confirmMessage: (tempId, realId, createdAt) => set((state) => ({
    messages: state.messages.map(m => 
      m.id === tempId 
        ? { ...m, id: realId, created_at: createdAt, isPending: false }
        : m
    )
  })),

  // Mark message as failed
  failMessage: (tempId) => set((state) => ({
    messages: state.messages.map(m => 
      m.id === tempId ? { ...m, isFailed: true, isPending: false } : m
    )
  })),
}));

// Selector for sorted messages (newest at bottom)
export const useSortedMessages = () => {
  const messages = useChatStore(state => state.messages);
  return [...messages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};

