# Security Fix Plan: Post Deletion Authorization

## Problem
Any logged-in user can delete any post from the home feed. Only the post owner should be able to delete their own post.

## Solution

### 1. Frontend Fix (src/pages/Home.tsx)
- Modify the post menu dropdown to conditionally render Edit and Delete buttons
- Only show these buttons when: `currentUserId === post.user_id`

### 2. Backend (Already Implemented)
- RLS policy exists: `CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);`
- This provides server-side protection against unauthorized deletions

## Changes Required

### File: src/pages/Home.tsx
- Location: Post menu dropdown (around line 465-480)
- Change: Add ownership check before showing Edit and Delete buttons
- Current code shows Edit/Delete for all posts
- Fixed code will only show for `post.user_id === currentUserId`

## Expected Behavior After Fix
- ✅ User can delete their own post
- ✅ User cannot see delete option on other users' posts
- ✅ User cannot see edit option on other users' posts  
- ✅ API blocks unauthorized deletion attempts (RLS policy)
- ✅ Existing UI functionality maintained (likes, comments, reactions)

