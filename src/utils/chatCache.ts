/**
 * Chat Cache Utility using IndexedDB
 * Provides localStorage-like caching but with much larger capacity (up to hundreds of MBs)
 * Similar to how Messenger caches data for instant loading
 */

import type { ChatMessage } from '@/types/chat';

const DB_NAME = 'chat_cache_db';
const DB_VERSION = 1;
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes cache expiry
const MAX_CACHED_MESSAGES = 500; // Max messages to cache per chat (much larger than localStorage)

interface CachedMessages {
  messages: ChatMessage[];
  timestamp: number;
  scrollPosition?: number;
}

interface CachedChatList {
  chats: ChatListItem[];
  timestamp: number;
  key?: string; // Added to differentiate
}

interface ChatListItem {
  id: string;
  name: string;
  avatar_url?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSender?: 'me' | 'them' | null;
  unreadCount: number;
}

// IndexedDB helpers
let db: IDBDatabase | null = null;

// Open IndexedDB database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!database.objectStoreNames.contains('messages')) {
        database.createObjectStore('messages', { keyPath: 'chatId' });
      }
      
      if (!database.objectStoreNames.contains('chatList')) {
        database.createObjectStore('chatList', { keyPath: 'timestamp' });
      }
      
      if (!database.objectStoreNames.contains('drafts')) {
        database.createObjectStore('drafts', { keyPath: 'chatId' });
      }
      
      if (!database.objectStoreNames.contains('avatars')) {
        database.createObjectStore('avatars', { keyPath: 'userId' });
      }
    };
  });
};

// Promise-based IndexedDB operations
const getFromStore = async (storeName: string, key: string): Promise<any> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const putToStore = async (storeName: string, value: any): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const deleteFromStore = async (storeName: string, key: string): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const clearStore = async (storeName: string): Promise<void> => {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

// =====================
// Message Caching
// =====================

/**
 * Cache messages to IndexedDB for instant loading
 */
export const cacheMessages = async (chatId: string, messages: ChatMessage[], scrollPosition?: number): Promise<void> => {
  if (!chatId) return;
  
  try {
    const cacheData: CachedMessages = {
      messages: messages.slice(0, MAX_CACHED_MESSAGES),
      timestamp: Date.now(),
      scrollPosition,
    };
    
    await putToStore('messages', { chatId, ...cacheData });
  } catch (error) {
    console.error('Error caching messages:', error);
    // Fallback to localStorage if IndexedDB fails
    fallbackToLocalStorage(chatId, messages, scrollPosition);
  }
};

interface CachedMessagesData {
  messages: ChatMessage[];
  timestamp: number;
  scrollPosition?: number;
  isExpired?: boolean;
}

/**
 * Load messages from IndexedDB cache
 */
export const loadCachedMessages = async (chatId: string): Promise<CachedMessagesData | null> => {
  if (!chatId) return null;
  
  try {
    const cached = await getFromStore('messages', chatId);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > CACHE_EXPIRY_MS;
    
    return {
      messages: cached.messages || [],
      isExpired,
      scrollPosition: cached.scrollPosition,
      timestamp: cached.timestamp,
    };
  } catch (error) {
    console.error('Error loading cached messages from IndexedDB:', error);
    // Fallback to localStorage
    return fallbackLoadFromLocalStorage(chatId);
  }
};

/**
 * Fallback to localStorage when IndexedDB fails
 */
const fallbackToLocalStorage = (chatId: string, messages: ChatMessage[], scrollPosition?: number) => {
  try {
    const cacheKey = `chat_cache_${chatId}`;
    const cacheData: CachedMessages = {
      messages: messages.slice(0, 100), // Limited in localStorage
      timestamp: Date.now(),
      scrollPosition,
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error in localStorage fallback:', error);
  }
};

/**
 * Fallback load from localStorage
 */
const fallbackLoadFromLocalStorage = (chatId: string): CachedMessagesData | null => {
  try {
    const cacheKey = `chat_cache_${chatId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const isExpired = Date.now() - cacheData.timestamp > CACHE_EXPIRY_MS;
    
    return {
      messages: cacheData.messages || [],
      isExpired,
      scrollPosition: cacheData.scrollPosition,
      timestamp: cacheData.timestamp,
    };
  } catch (error) {
    console.error('Error in localStorage fallback load:', error);
    return null;
  }
};

// =====================
// Scroll Position
// =====================

/**
 * Save scroll position for a chat
 */
export const saveScrollPosition = async (chatId: string, position: number): Promise<void> => {
  if (!chatId) return;
  
  try {
    const cached = await getFromStore('messages', chatId);
    const cacheData: CachedMessages = cached || { messages: [], timestamp: Date.now() };
    cacheData.scrollPosition = position;
    
    await putToStore('messages', { chatId, ...cacheData });
  } catch (error) {
    console.error('Error saving scroll position:', error);
  }
};

/**
 * Load scroll position for a chat
 */
export const loadScrollPosition = async (chatId: string): Promise<number | null> => {
  if (!chatId) return null;
  
  try {
    const cached = await getFromStore('messages', chatId);
    return cached?.scrollPosition ?? null;
  } catch (error) {
    console.error('Error loading scroll position:', error);
    return null;
  }
};

// =====================
// Draft Messages
// =====================

/**
 * Save draft message to IndexedDB
 */
export const saveDraft = async (chatId: string, draft: string): Promise<void> => {
  if (!chatId) return;
  
  try {
    await putToStore('drafts', { chatId, draft, timestamp: Date.now() });
  } catch (error) {
    console.error('Error saving draft:', error);
    // Fallback to localStorage
    localStorage.setItem(`chat_cache_draft_${chatId}`, draft);
  }
};

/**
 * Load draft message from IndexedDB
 */
export const loadDraft = async (chatId: string): Promise<string> => {
  if (!chatId) return '';
  
  try {
    const cached = await getFromStore('drafts', chatId);
    return cached?.draft || '';
  } catch (error) {
    console.error('Error loading draft:', error);
    // Fallback to localStorage
    return localStorage.getItem(`chat_cache_draft_${chatId}`) || '';
  }
};

/**
 * Clear draft message
 */
export const clearDraft = async (chatId: string): Promise<void> => {
  if (!chatId) return;
  
  try {
    await deleteFromStore('drafts', chatId);
  } catch (error) {
    console.error('Error clearing draft:', error);
  }
  // Also clear from localStorage fallback
  localStorage.removeItem(`chat_cache_draft_${chatId}`);
};

// =====================
// Chat List Caching
// =====================

/**
 * Cache chat list for instant loading
 */
export const cacheChatList = async (chats: ChatListItem[]): Promise<void> => {
  try {
    const cacheData: CachedChatList = {
      chats,
      timestamp: Date.now(),
    };
    
    await putToStore('chatList', cacheData);
  } catch (error) {
    console.error('Error caching chat list:', error);
  }
};

/**
 * Load chat list from cache
 */
export const loadCachedChatList = async (): Promise<{ chats: ChatListItem[]; isExpired: boolean } | null> => {
  try {
    // Get the single chat list entry (we store with key 'latest')
    const cached = await getFromStore('chatList', 'latest');
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > CACHE_EXPIRY_MS;
    
    return {
      chats: cached.chats,
      isExpired,
    };
  } catch (error) {
    console.error('Error loading cached chat list:', error);
    return null;
  }
};

/**
 * Save chat list to IndexedDB (uses 'latest' key)
 */
export const saveChatListToCache = async (chats: ChatListItem[]): Promise<void> => {
  try {
    await putToStore('chatList', { key: 'latest', chats: chats, timestamp: Date.now() });
  } catch (error) {
    console.error('Error saving chat list to cache:', error);
  }
};

/**
 * Invalidate chat list cache - call this when messages are deleted/unsent
 * This forces a fresh fetch when returning to chat list
 */
export const invalidateChatListCache = async (): Promise<void> => {
  try {
    // Delete the cached chat list so next load fetches fresh data
    await deleteFromStore('chatList', 'latest');
    // Also clear localStorage fallback
    localStorage.removeItem('chat_cache_latest');
  } catch (error) {
    console.error('Error invalidating chat list cache:', error);
  }
};

// =====================
// Avatar Preloading
// =====================

/**
 * Cache avatar URL for quick access
 */
export const cacheAvatar = async (userId: string, avatarUrl: string): Promise<void> => {
  if (!userId) return;
  
  try {
    await putToStore('avatars', { userId, avatarUrl, timestamp: Date.now() });
  } catch (error) {
    console.error('Error caching avatar:', error);
  }
};

/**
 * Load cached avatar URL
 */
export const loadCachedAvatar = async (userId: string): Promise<string | null> => {
  if (!userId) return null;
  
  try {
    const cached = await getFromStore('avatars', userId);
    return cached?.avatarUrl || null;
  } catch (error) {
    console.error('Error loading cached avatar:', error);
    return null;
  }
};

/**
 * Preload multiple avatars at once
 */
export const preloadAvatars = async (users: { id: string; avatar_url?: string }[]): Promise<void> => {
  const avatarCache: Record<string, string> = {};
  
  for (const user of users) {
    if (user.avatar_url) {
      avatarCache[user.id] = user.avatar_url;
      // Cache in IndexedDB
      await cacheAvatar(user.id, user.avatar_url);
    }
  }
  
  // Store in memory for quick access
  window.__avatarCache = { ...window.__avatarCache, ...avatarCache };
};

// Extend window type for avatar cache
declare global {
  interface Window {
    __avatarCache?: Record<string, string>;
  }
}

// =====================
// Cache Management
// =====================

/**
 * Clear all cached data for a chat
 */
export const clearChatCache = async (chatId: string): Promise<void> => {
  if (!chatId) return;
  
  try {
    await deleteFromStore('messages', chatId);
    await deleteFromStore('drafts', chatId);
  } catch (error) {
    console.error('Error clearing chat cache:', error);
  }
  
  // Also clear localStorage fallback
  localStorage.removeItem(`chat_cache_${chatId}`);
  localStorage.removeItem(`chat_cache_draft_${chatId}`);
};

/**
 * Clear old/expired caches
 */
export const clearExpiredCaches = async (): Promise<void> => {
  try {
    // Clear expired message caches
    // In IndexedDB, we'd need to iterate through all entries
    // For simplicity, we'll just clear the chat list cache periodically
    const cached = await getFromStore('chatList', 'latest');
    if (cached && Date.now() - cached.timestamp > CACHE_EXPIRY_MS * 2) {
      await deleteFromStore('chatList', 'latest');
    }
  } catch (error) {
    console.error('Error clearing expired caches:', error);
  }
};

/**
 * Get all cached chat IDs
 */
export const getCachedChatIds = async (): Promise<string[]> => {
  // This would require iterating through IndexedDB
  // For now, return empty array as we track this differently
  return [];
};

/**
 * Clear all caches (for logout or cleanup)
 */
export const clearAllCaches = async (): Promise<void> => {
  try {
    await clearStore('messages');
    await clearStore('chatList');
    await clearStore('drafts');
    await clearStore('avatars');
  } catch (error) {
    console.error('Error clearing all caches:', error);
  }
  
  // Also clear localStorage fallbacks
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('chat_cache')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

/**
 * Initialize the cache database
 * Call this on app startup
 */
export const initializeCache = async (): Promise<void> => {
  try {
    await openDB();
    console.log('Chat cache initialized with IndexedDB');
  } catch (error) {
    console.error('Failed to initialize chat cache:', error);
  }
};

// =====================
// Offline Queue (for messages sent while offline)
// =====================

const OFFLINE_QUEUE_KEY = 'chat_offline_queue';

/**
 * Queue a message to be sent when back online
 */
export const queueOfflineMessage = async (message: {
  sender_id: string;
  receiver_id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  reply_to_id?: string;
}): Promise<void> => {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push({ ...message, queuedAt: Date.now() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error queueing offline message:', error);
  }
};

/**
 * Get queued offline messages
 */
export const getOfflineMessageQueue = (): Array<{
  sender_id: string;
  receiver_id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  reply_to_id?: string;
  queuedAt: number;
}> => {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

/**
 * Clear offline message queue (after successfully sending)
 */
export const clearOfflineQueue = (): void => {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
};

/**
 * Remove specific message from offline queue
 */
export const removeFromOfflineQueue = (index: number): void => {
  try {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.splice(index, 1);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error removing from offline queue:', error);
  }
};

