# Premium Upgrade Plan - Comprehensive Implementation

## Information Gathered:
Based on code analysis:
- Current color system: Background #111111, Primary #355935, Card #1A221F, Heart #FF0000
- UI framework: React + Tailwind + Framer Motion
- Pages: Landing, Auth, ProfileSetup, Discover, Matches, Chat, ChatList, Settings
- Components: UserCard, MatchCard, Navbar, Chat components (TypingIndicator, MessageInput, etc.)
- Glassmorphism: Currently using bg-card/80, border-white/10 effects

---

## Plan:

### Phase 1: UI Premium Color System Upgrade
1. **tailwind.config.ts** - Update color palette:
   - Background: #0E0F0F (deeper black)
   - Card: #161A18 (more contrast)
   - Primary: Emerald gradient from-[#1B5E3A] to-[#2E7D57]
   - Heart: #FF2D55 (soft neon red)
   - Add glow shadow utility

2. **src/index.css** - Update CSS variables:
   - Update --background, --card, --primary
   - Add emerald gradient utilities
   - Reduce glassmorphism blur

3. **src/components/ui/card.tsx** - Add premium variants:
   - Add "premium" variant with new styling
   - Add "gradient" variant for primary elements

### Phase 2: Discover Page UX Upgrade
4. **src/pages/Discover.tsx**:
   - Add crush limit (max 5) with counter display "X/5 selected"
   - Add "Someone has a crush on you 👀" notification logic
   - Add match reveal animation overlay

5. **src/components/UserCard.tsx**:
   - Update heart color to #FF2D55
   - Add floating heart animation burst on selection
   - Add card scale animation
   - Add glow border on selection: shadow-[0_0_20px_rgba(255,45,85,0.3)]
   - Add double-tap to select
   - Add haptic vibration

### Phase 3: Chat UX Improvements
6. **src/pages/Chat.tsx**:
   - Replace "Online" with "Active Now"
   - Add fade gradient when scrolling up
   - Add full-screen match reveal animation with animated hearts
   - Improve message bubbles (rounder, softer shadow)

7. **src/components/chat/TypingIndicator.tsx**:
   - Make bouncing dots more subtle and modern

### Phase 4: Privacy & Settings
8. **src/pages/Settings.tsx**:
   - Add screenshot warning option
   - Add block user feature UI
   - Add hide class/batch option

### Phase 5: Visual Hierarchy
9. **src/components/Navbar.tsx**:
   - Improve spacing and contrast

10. **src/pages/Landing.tsx**:
    - Update to match new premium color scheme

### Phase 6: Performance (Database)
11. **supabase/schema.sql additions**:
    - Add indexes on user_id, crush_id, match_id, created_at

---

## Dependent Files to be edited:
1. tailwind.config.ts
2. src/index.css
3. src/components/ui/card.tsx
4. src/pages/Discover.tsx
5. src/components/UserCard.tsx
6. src/pages/Chat.tsx
7. src/components/chat/TypingIndicator.tsx
8. src/pages/Settings.tsx
9. src/components/Navbar.tsx
10. src/pages/Landing.tsx

## Followup steps:
- Test all color changes match across components
- Verify haptic feedback works on mobile
- Test crush limit functionality
- Check match reveal animation

