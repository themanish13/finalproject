# Realtime Listener Pattern Implementation

This document describes the realtime patterns implemented in the app following the event-driven architecture.

## Overview

Instead of refreshing pages, the app subscribes to database events and updates React state automatically:

```
Database change
      ↓
Supabase realtime event
      ↓
React state update
      ↓
UI updates automatically
```

## Implemented Hooks

### 1. useChatRealtime (Existing)

Location: `src/hooks/useChatRealtime.ts`

Handles realtime for chat messages:
- Listens for INSERT (new messages)
- Listens for UPDATE (unsent, reactions, read receipts, status)
- Listens for DELETE (message deletion)
- Supports presence for typing indicators

```typescript
const { markAsSeen, markAllAsSeen } = useChatRealtime({
  chatId: matchId,
  currentUserId: userId,
  onMessageReceived: (message) => { /* handle new message */ },
  onMessageUpdated: (message) => { /* handle message update */ },
  onMessageDeleted: (messageId) => { /* handle deletion */ },
});
```

### 2. useMatches (New)

Location: `src/hooks/useMatches.ts`

Provides realtime updates for new matches:
- Fetches initial matches on load
- Listens for INSERT events on matches table
- Automatically updates UI when a new match occurs

```typescript
const { matches, loading, refresh } = useMatches(userId);

// Transform for display
const displayMatches = matches.map(match => ({
  id: match.user1_id === userId ? match.user2_id : match.user1_id,
  name: match.profile?.name,
  // ...
}));
```

### 3. useNotifications (New)

Location: `src/hooks/useNotifications.ts`

Provides realtime notifications:
- Fetches initial notifications
- Listens for INSERT (new notifications)
- Listens for UPDATE (read status changes)
- Shows browser notifications when permitted

```typescript
const { 
  notifications, 
  unreadCount, 
  markAsRead, 
  markAllAsRead, 
  deleteNotification 
} = useNotifications(userId);
```

### 4. useUnreadCounts (Existing)

Location: `src/hooks/useUnreadCounts.ts`

Provides realtime unread counts:
- Listens for new messages
- Tracks unread count per conversation
- Updates UI in real-time

```typescript
const { 
  unreadCounts, 
  totalUnread, 
  getUnreadForChat, 
  markChatAsRead 
} = useUnreadCounts({ userId });
```

### 5. useUserPresence (New)

Location: `src/hooks/useUserPresence.ts`

Tracks online/offline status using Supabase Presence:
- Uses Supabase presence (not database) for real-time status
- Handles page visibility changes
- Provides formatted "last seen" strings

```typescript
const { 
  onlineUsers, 
  isUserOnline, 
  formatLastSeen 
} = useUserPresence(userId);

// Check if user is online
if (isUserOnline(targetUserId)) {
  return <OnlineIndicator />;
}

// Format last seen
const status = formatLastSeen(targetUserId); // "Online now", "5m ago", etc.
```

## Optimistic UI Pattern

For sending messages, the app uses optimistic updates:

```typescript
const sendMessage = async (text: string) => {
  // 1. Add to UI immediately (optimistic)
  const tempId = addOptimisticMessage({
    sender_id: userId,
    receiver_id: chatId,
    content: text,
    status: 'sent',
  });

  // 2. Send to database
  const { data, error } = await supabase
    .from('messages')
    .insert({ /* ... */ });

  // 3. Confirm with real data or fail
  if (error) {
    failMessage(tempId);
  } else {
    confirmMessage(tempId, data.id, data.created_at);
  }
};
```

## Database Setup

Run the SQL file to set up the necessary tables and triggers:

Location: `realtime-notifications-schema.sql`

This creates:
- `notifications` table with realtime
- `user_presence` table for persistent presence (optional)
- Triggers for automatic match notifications

## Key Principles

1. **Never use page refresh**: Use `setMessages()`, `setMatches()`, etc. instead of `router.refresh()` or `window.location.reload()`

2. **Use optimistic updates**: Update UI immediately, then sync with server

3. **Clean up subscriptions**: Always return cleanup function in useEffect to remove channels

4. **Prevent duplicates**: Check if message already exists before adding

5. **Handle reconnection**: Fetch missed messages after reconnection

## Testing Realtime

1. Open the app in two browser windows
2. Send a message or make a match in one window
3. Watch the other window update automatically without refresh

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
├──────────────┬──────────────┬──────────────┬────────────┤
│  useMatches  │useChatRealtime│useNotifications│useUnread │
└──────┬───────┴──────┬───────┴───────┬───────┴─────┬────┘
       │              │               │             │
       └──────────────┴───────────────┴─────────────┘
                          │
                    Realtime Subscription
                          │
       ┌──────────────────┴──────────────────┐
       │         Supabase Database           │
       ├──────────────┬──────────────┬───────┤
       │   matches    │  messages    │notif..│
       └──────────────┴──────────────┴───────┘
```

