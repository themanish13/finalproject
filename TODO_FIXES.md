# TODO Fixes Implementation

## Task 1: Fix Anonymous Post Bug
- [x] Add `is_anonymous` field to Post interface
- [x] Fetch `is_anonymous` from database in loadPosts
- [x] Fetch user name from profiles table
- [x] Display user name when not anonymous, "Anonymous" when anonymous
- [x] SQL file created: add-is-anonymous-column.sql

## Task 2: Increase Font Sizes (2x)
- [x] Post content: increased from text-sm to text-base
- [x] Post author name: increased to text-base
- [x] Comment font: equal to post size (text-base) 
- [x] Nested reply font: equal to comment size (text-base)
- [x] Applied consistent sizing throughout

## Task 3: Fix Comment Name Format
- [x] Moved name above the comment content (not same line)
- [x] Name and avatar on top row, comment below

## Task 4: Fix Three-Dot Menu Visibility
- [x] Increased z-index from z-10 to z-50 for comment menu
- [x] Made icons and text larger for better visibility

## Task 5: Fix SwipeWrapper in Chat
- [x] Added swipe gesture detection in Chat.tsx
- [x] Swipe right from left edge goes back to previous page
- [x] Works regardless of content on screen

