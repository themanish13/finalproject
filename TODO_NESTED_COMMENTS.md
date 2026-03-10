# Nested Comments Implementation Plan - COMPLETED ✅

## Task Requirements - All Implemented:
1. ✅ Post shows total comment count (nested included)
2. ✅ Each comment with replies shows "View Replies (N)" button
3. ✅ Clicking expands/collapses nested replies
4. ✅ Supports infinite levels of nested comments

## Implementation Summary:

### 1. Total Comment Count (include nested replies)
**File:** `src/pages/Home.tsx`
- Added recursive `countAllReplies()` helper function
- Counts both direct comments AND all nested replies recursively
- Updated `loadPosts()` to use recursive counting for accurate totals

### 2. View Replies Button
**File:** `src/pages/Home.tsx`
- Shows "View Replies (N)" button when reply count > 0
- Click toggles expand/collapse of replies
- Shows correct count of nested replies

### 3. Expand/Collapse Functionality
**File:** `src/pages/Home.tsx`
- `toggleReplies()` function handles show/hide
- Uses AnimatePresence for smooth animations

### 4. Infinite Nesting Support
**File:** `src/pages/Home.tsx`
- Removed depth limitations
- Supports unlimited nesting levels
- Each reply can have its own nested replies with "View Replies" buttons

## Key Features:
- **Recursive counting**: Counts all replies at any depth
- **Visual feedback**: Shows "View X replies" / "Hide X replies" 
- **Lazy loading**: Replies load on demand when expanded
- **Performance optimized**: Only fetches what's needed

