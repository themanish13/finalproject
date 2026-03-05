# Unsend Feature Fix Plan

## Problem
The Unsend feature currently only removes the message from the sender's UI. The receiver still sees the message because:
1. Database DELETE might not be syncing properly via Supabase realtime
2. No filter for `is_unsent` in the message fetch query
3. Receiver's realtime listener might not be receiving DELETE events

## Solution: Soft Delete + Broadcast Notifications

The fix uses Supabase's **broadcast feature** to directly notify the receiver when a message is unsent. This doesn't depend on database realtime being enabled.

## Implementation Completed:

### 1. Database Change (Required)
The `messages` table must have an `is_unsent` column. Run this in Supabase SQL editor if it doesn't exist:
```sql
ALTER TABLE messages ADD COLUMN is_unsent boolean DEFAULT false;
```

### 2. Frontend Changes in Chat.tsx:

#### A. handleUnsendMessage function:
- Uses soft delete: `UPDATE messages SET is_unsent = true` instead of DELETE
- Sends broadcast notification to the receiver using Supabase realtime
- This doesn't depend on database realtime being enabled

#### B. Message Fetch Query:
- Added `.or("is_unsent.is.null,is_unsent.eq.false")` to filter unsent messages at database level
- Ensures messages don't reappear after page refresh

#### C. Realtime Listeners:
- Created unified `chatChannel` for all real-time communication
- Added broadcast listener for `unsend` events - this is the PRIMARY notification method
- Also listens for UPDATE events as fallback (if database realtime is enabled)
- Listens for INSERT events with filtering for unsent messages

### How it works now:

1. **Sender presses Unsend:**
   - Message is marked `is_unsent = true` in database (soft delete)
   - Broadcast notification is sent to receiver via Supabase channel
   - Message is removed from sender's UI immediately
   - Message ID is saved to localStorage

2. **Receiver receives broadcast:**
   - The `chatChannel` listens for `unsend` broadcast events
   - When received, the message is removed from receiver's UI
   - Message ID is saved to localStorage

3. **After refresh:**
   - Messages with `is_unsent = true` are filtered out at database query level
   - localStorage is checked for any deleted message IDs
   - Message won't reappear

## Files Modified:
- `src/pages/Chat.tsx` - Main chat component (all changes applied)

