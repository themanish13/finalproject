# TODO: Remove Voicemail and Reaction Features from Chat.tsx

## Plan:
- [x] 1. Fix broken code in Chat.tsx (incomplete functions)
- [x] 2. Remove voicemail/audio handling code from Chat.tsx
- [x] 3. Remove reaction feature code from Chat.tsx
- [x] 4. Update MessageActionSheet.tsx to remove reaction features

## Completed:
- ✅ Removed `reactions` field from Message interface
- ✅ Removed `handleReaction` and `handleQuickReaction` functions
- ✅ Removed reaction realtime listeners
- ✅ Removed QUICK_REACTIONS and ReactionBadge components
- ✅ Removed audio file type handling (only image/video now)
- ✅ Updated long-press popup to only show Reply, Copy, Delete options
- ✅ Fixed broken code in Chat.tsx (completed truncated functions)
- ✅ Cleaned up MessageActionSheet.tsx - removed SUPER_REACTIONS
- ✅ Updated MediaPreview - removed audio type support

