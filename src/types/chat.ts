// Message status enum
export type MessageStatus = 'sent' | 'delivered' | 'seen';

// Extended ChatMessage interface with status
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
  status?: MessageStatus;
  delivered_at?: string | null;
}

// Chat participant (for tracking last read message)
export interface ChatParticipant {
  id?: string;
  chat_id: string;
  user_id: string;
  last_read_message_id?: string | null;
  unread_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Unread counts map - chatId to count
export type UnreadCountsMap = Record<string, number>;

// Chat state interface
export interface ChatState {
  messages: ChatMessage[];
  currentChatId: string | null;
  currentUserId: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  lastReadMessageId: string | null;
  isAtBottom: boolean; // Track if user is at bottom of chat
  pendingAttachments: PendingAttachment[];
}

export interface PendingAttachment {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video' | 'file';
  progress: number;
  isUploading: boolean;
}

// Message input state
export interface MessageInputState {
  content: string;
  replyToMessage: ChatMessage | null;
}

// Chat actions
export interface ChatActions {
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
  
  // Optimistic UI helpers
  addOptimisticMessage: (message: Omit<ChatMessage, 'id' | 'created_at' | 'isPending'>) => string;
  confirmMessage: (tempId: string, realId: string, createdAt: string) => void;
  failMessage: (tempId: string) => void;
  
  // Attachment handling
  addPendingAttachment: (attachment: PendingAttachment) => void;
  updatePendingAttachment: (id: string, updates: Partial<PendingAttachment>) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
}

// Full store type
export type ChatStore = ChatState & ChatActions;

// Realtime event types
export type RealtimeMessageEvent = {
  new: ChatMessage;
  old: ChatMessage;
};

export type RealtimeMessageInsert = {
  new: ChatMessage;
};

export type RealtimeMessageUpdate = {
  new: ChatMessage;
  old: ChatMessage;
};

// UseChatRealtime hook options
export interface UseChatRealtimeOptions {
  chatId: string;
  currentUserId: string;
  onMessageReceived?: (message: ChatMessage) => void;
  onMessageUpdated?: (message: ChatMessage) => void;
  onMessageDeleted?: (messageId: string) => void;
}

// UseInfiniteScroll options
export interface UseInfiniteScrollOptions {
  chatId: string;
  currentUserId: string;
}

