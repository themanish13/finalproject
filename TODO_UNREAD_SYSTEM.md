# Unread Message System Implementation Plan

## Task: Create a professional unread message system similar to Facebook Messenger

### Database Schema Updates
- [x] 1. Create new SQL file: `unread-system-schema.sql` with chat_participants table
- [x] 2. Add efficient indexes for unread counting
- [x] 3. Add RLS policies for chat_participants

### TypeScript Types
- [x] 4. Update `src/types/chat.ts` - Add ChatParticipant interface
- [x] 5. Add UnreadInfo type for efficient unread tracking

### State Management (Zustand Store)
- [x] 6. Update `src/store/chatStore.ts` - Add unreadCounts state
- [x] 7. Add methods: setUnreadCount, updateUnreadCount, setAllUnreadCounts
- [x] 8. Add selector: useGlobalUnreadCount

### New Hooks
- [x] 9. Create `src/hooks/useUnreadCounts.ts` - Main hook for unread management
- [x] 10. Create `src/hooks/useMarkAsSeen.ts` - Handle marking messages as seen

### UI Components
- [x] 11. Update `src/pages/ChatList.tsx` - Integrate useUnreadCounts
- [x] 12. Update `src/components/chat/ChatListItem.tsx` - Unread badge styling (already has it)
- [x] 13. Update `src/pages/Chat.tsx` - Mark as seen when opening chat

### Realtime Updates
- [x] 14. Add realtime subscription for unread count changes
- [x] 15. Ensure instant UI updates without page reload

## Implementation Priority:
1. Database Schema (Foundation)
2. Types (Type safety)
3. Store (State management)
4. Hooks (Business logic)
5. UI Integration (User experience)
6. Realtime (Real-time updates)

## Next Steps:
1. Run the SQL in Supabase SQL Editor to create the chat_participants table
2. Test the unread count system

