import { create } from 'zustand';
import type { ChatMessage, MessageStatus, PendingAttachment, UnreadCountsMap } from '@/types/chat';

export type { ChatMessage, MessageStatus, PendingAttachment, UnreadCountsMap } from '@/types/chat';

interface ChatState {
  // State
  messages: ChatMessage[];
  currentChatId: string | null;
  currentUserId: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  lastReadMessageId: string | null;
  isAtBottom: boolean; // Track if user is at bottom of chat
  pendingAttachments: PendingAttachment[];
  
  // Unread counts - map of chatId to unread count
  unreadCounts: UnreadCountsMap;
  
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
  setIsAtBottom: (isAtBottom: boolean) => void;
  
  // Unread count methods
  setUnreadCount: (chatId: string, count: number) => void;
  incrementUnreadCount: (chatId: string) => void;
  clearUnreadCount: (chatId: string) => void;
  setAllUnreadCounts: (counts: UnreadCountsMap) => void;
  
  // Optimistic UI helpers
  addOptimisticMessage: (message: Omit<ChatMessage, 'id' | 'created_at' | 'isPending'>) => string;
  confirmMessage: (tempId: string, realId: string, createdAt: string, status?: MessageStatus) => void;
  failMessage: (tempId: string) => void;
  
  // Attachment handling
  addPendingAttachment: (attachment: PendingAttachment) => void;
  updatePendingAttachment: (id: string, updates: Partial<PendingAttachment>) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  
  // Message status helpers
  markMessageAsDelivered: (messageId: string) => void;
  markMessageAsSeen: (messageId: string) => void;
  markAllMessagesAsSeen: () => void;
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
  isAtBottom: true,
  pendingAttachments: [],
  unreadCounts: {},

  // Set all messages (replaces current state)
  setMessages: (messages) => set({ messages }),

  // Add single message (for realtime) - only if not already exists
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

  // Update a message (for reactions, read receipts, status, etc.)
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
    isAtBottom: true,
    pendingAttachments: [],
  }),

  setIsAtBottom: (isAtBottom) => set({ isAtBottom }),

  // Unread count methods
  setUnreadCount: (chatId, count) => set((state) => ({
    unreadCounts: { ...state.unreadCounts, [chatId]: count }
  })),

  incrementUnreadCount: (chatId) => set((state) => ({
    unreadCounts: { 
      ...state.unreadCounts, 
      [chatId]: (state.unreadCounts[chatId] || 0) + 1 
    }
  })),

  clearUnreadCount: (chatId) => set((state) => {
    const { [chatId]: _, ...rest } = state.unreadCounts;
    return { unreadCounts: rest };
  }),

  setAllUnreadCounts: (counts) => set({ unreadCounts: counts }),

  // Optimistic UI: Add message immediately
  addOptimisticMessage: (message) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMessage: ChatMessage = {
      ...message,
      id: tempId,
      created_at: new Date().toISOString(),
      isPending: true,
      status: (message as any).status || 'sent',
    };
    
    set((state) => ({
      messages: [...state.messages, optimisticMessage]
    }));
    
    return tempId;
  },

  // Confirm message after server response
  confirmMessage: (tempId, realId, createdAt, status = 'sent') => set((state) => ({
    messages: state.messages.map(m => 
      m.id === tempId 
        ? { ...m, id: realId, created_at: createdAt, isPending: false, status }
        : m
    )
  })),

  // Mark message as failed
  failMessage: (tempId) => set((state) => ({
    messages: state.messages.map(m => 
      m.id === tempId ? { ...m, isFailed: true, isPending: false } : m
    )
  })),

  // Attachment handling
  addPendingAttachment: (attachment) => set((state) => ({
    pendingAttachments: [...state.pendingAttachments, attachment]
  })),

  updatePendingAttachment: (id, updates) => set((state) => ({
    pendingAttachments: state.pendingAttachments.map(a =>
      a.id === id ? { ...a, ...updates } : a
    )
  })),

  removePendingAttachment: (id) => set((state) => ({
    pendingAttachments: state.pendingAttachments.filter(a => a.id !== id)
  })),

  clearPendingAttachments: () => set({ pendingAttachments: [] }),

  // Message status helpers
  markMessageAsDelivered: (messageId) => set((state) => ({
    messages: state.messages.map(m =>
      m.id === messageId ? { ...m, status: 'delivered', delivered_at: new Date().toISOString() } : m
    )
  })),

  markMessageAsSeen: (messageId) => set((state) => ({
    messages: state.messages.map(m =>
      m.id === messageId ? { ...m, status: 'seen', read_at: new Date().toISOString() } : m
    )
  })),

  markAllMessagesAsSeen: () => set((state) => ({
    messages: state.messages.map(m => {
      // Only mark messages from other users as seen
      if (m.sender_id !== state.currentUserId && !m.read_at) {
        return { ...m, status: 'seen', read_at: new Date().toISOString() };
      }
      return m;
    })
  })),
}));

// Selector for sorted messages (newest at bottom)
export const useSortedMessages = () => {
  const messages = useChatStore(state => state.messages);
  return [...messages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};

// Selector for unread message count
export const useUnreadCount = () => {
  const messages = useChatStore(state => state.messages);
  const currentUserId = useChatStore(state => state.currentUserId);
  return messages.filter(m => 
    m.sender_id !== currentUserId && !m.read_at
  ).length;
};

// Selector for pending messages (for optimistic UI)
export const usePendingMessages = () => {
  const messages = useChatStore(state => state.messages);
  return messages.filter(m => m.isPending);
};

