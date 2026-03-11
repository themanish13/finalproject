# CrushRadar - Documentation Guide

This guide tells you what to include in your future documentation to make it better and easier to understand.

---

## 1. What Is This App? (Project Overview)

Simple explanation:
> CrushRadar is a privacy-first app that helps you find mutual crushes. You can select your crushes anonymously, and only when someone selects you back, you both get notified. It's like a secret matchmaker!

### Core Features (List Simply):
- Swipe to select crushes
- Anonymous crush selection (nobody knows unless it's mutual)
- Real-time chat with matches
- Anonymous posts/feed
- Like and comment on posts

---

## 2. How to Install (Installation Guide)

### Prerequisites Needed:
- Node.js (version 18 or higher)
- npm or bun package manager
- Supabase account (free tier works)

### Step-by-Step Setup:

```bash
# 1. Clone or download the project
cd your-project-folder

# 2. Install all dependencies
npm install
# OR if using bun
bun install

# 3. Set up environment variables
# Create a file called .env.local with:
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# 4. Run the app
npm run dev
```

The app will open at: `http://localhost:8080`

---

## 3. Tech Stack (What Tools Are Used)

| Part | Technology |
|------|------------|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL) |
| Real-time | Supabase Realtime |
| PWA | vite-plugin-pwa + Workbox |
| State Management | Zustand |
| Data Fetching | React Query |

---

## 4. Database Schema Guide

Explain each table simply:

### Tables:

| Table | Purpose |
|-------|---------|
| `users` | Account info (handled by Supabase Auth) |
| `profiles` | User profile data (name, bio, avatar) |
| `posts` | Feed posts (can be anonymous) |
| `crushes` | Your crush selections |
| `matches` | Mutual crushes (when both like each other) |
| `messages` | Chat messages |
| `comments` | Comments on posts |
| `comment_replies` | Replies to comments |

### Important: Anonymous Posts
- Posts can be anonymous (`is_anonymous = true`)
- Anonymous posts show "Anonymous" instead of username
- Only the post owner can see who posted

---

## 5. PWA Features Explained

PWA = Progressive Web App (works like a real app!)

### What's Included:
- Installable on mobile/desktop
- Works offline (partially)
- App-like experience
- Push notifications ready

### How to Install:
**On Mobile:**
1. Visit the website
2. Tap "Share" or menu button
3. Tap "Add to Home Screen"

**On Desktop:**
1. Click the install icon in address bar
2. Or right-click > "Install CrushRadar"

---

## 6. Feature Documentation

### A. How Crush Selection Works:
1. User sees list of potential crushes (Discover page)
2. User selects someone (stored in `crushes` table)
3. System checks if that person also selected you
4. If mutual → Create a match in `matches` table
5. Both users get notified

### B. Anonymous Posts:
1. User creates a post with "Post Anonymously" toggle ON
2. Post saved with `is_anonymous = true`
3. Others see "Anonymous" as author
4. Only you can see it's your post

### C. Real-time Chat:
- Uses Supabase Realtime subscriptions
- Messages appear instantly
- Typing indicators show when someone is typing
- Unread message counts update automatically

---

## 7. Security Features

### Important Security Points:

1. **Row Level Security (RLS)**
   - Database rules protect data
   - Users can only see their own matches
   - Users can only delete their own posts

2. **Anonymous Protection**
   - Crush selections are hidden until mutual
   - Anonymous posts hide user identity
   - No one can see who you liked unless it's a match

---

## 8. Deployment Guide

### Deploy to Vercel (Free):

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Add environment variables in Vercel dashboard:
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

### Or Connect GitHub:
1. Push code to GitHub
2. Go to vercel.com
3. Import your repository
4. Add environment variables
5. Deploy!

---

## 9. Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| App not loading | Check if Supabase URL and key are correct |
| Chat not working | Check Supabase Realtime is enabled |
| PWA not installing | Make sure you're using HTTPS (or localhost) |
| Images not showing | Check storage bucket permissions in Supabase |

---

## 10. Project Structure

Explain folders simply:

```
src/
├── components/     # UI pieces (buttons, cards, etc.)
├── contexts/       # React contexts (state management)
├── hooks/          # Reusable functions
├── pages/          # Main app pages (Home, Chat, etc.)
├── store/          # Zustand stores
├── types/          # TypeScript definitions
└── utils/          # Helper functions
```

---

## 11. Future Improvements Ideas

These can be added later:

### 🔔 Notifications & Alerts
- [ ] Push notifications for new matches
- [ ] Push notifications for new messages
- [ ] Push notifications for likes on posts
- [ ] In-app notification center
- [ ] Notification sound settings
- [ ] Quiet hours / Do Not Disturb mode

### 💬 Chat Features
- [ ] Voice messages in chat
- [ ] Video calling between matches
- [ ] Image zoom functionality
- [ ] Message read receipts (seen ✓✓)
- [ ] Online/offline status indicator
- [ ] Typing indicators (already implemented ✓)
- [ ] Message reactions (emoji)
- [ ] Chat wallpapers
- [ ] Message delete for everyone
- [ ] Chat archiving
- [ ] Chat search functionality

### 👤 User Profile Features
- [ ] Multiple photos in profile
- [ ] Profile photo album/gallery
- [ ] Video profile introduction
- [ ] Social media links in profile
- [ ] Interest tags/categories
- [ ] Verified profile badge
- [ ] Profile visibility settings
- [ ] Account deactivation option

### 🔒 Privacy & Safety
- [ ] Block user feature
- [ ] Report user feature
- [ ] Hide from specific users
- [ ] Private mode (hide from certain people)
- [ ] Two-factor authentication (2FA)
- [ ] Login alerts (new device detection)
- [ ] Data export option
- [ ] Account deletion with data wipe

### 🎨 UI/UX Improvements
- [ ] Dark/Light theme toggle
- [ ] Custom app colors/themes
- [ ] Animated transitions
- [ ] Better loading skeletons
- [ ] Pull-to-refresh on all pages
- [ ] Swipe gestures everywhere
- [ ] Haptic feedback on mobile
- [ ] Accessibility improvements (screen reader support)

### 🏆 Engagement Features
- [ ] Daily swipe limits (gamification)
- [ ] "Super Like" feature
- [ ] "Boost" profile feature
- [ ] User rankings/popularity score
- [ ] Streaks (consecutive days active)
- [ ] Achievement badges
- [ ] Referral system

### 🔍 Discovery Features
- [ ] Advanced filters (age, location, interests)
- [ ] Search users by name/username
- [ ] "People Near You" location feature
- [ ] Browse by categories
- [ ] "Favorites" list
- [ ] Recently viewed profiles

### 📱 PWA Enhancements
- [ ] Full offline mode
- [ ] Background sync for messages
- [ ] App shortcuts (quick actions)
- [ ] Share target (receive shared content)
- [ ] Badge count on app icon
- [ ] Better cache management

### 🛠️ Technical Improvements
- [ ] Rate limiting on API calls
- [ ] Image compression before upload
- [ ] Lazy loading for all media
- [ ] Code splitting optimization
- [ ] Bundle size reduction
- [ ] Performance monitoring
- [ ] Error logging system
- [ ] Analytics integration

### 💾 Data & Backend
- [ ] Cloud storage for media files
- [ ] Image CDN setup
- [ ] Database backups automation
- [ ] API rate limiting
- [ ] WebSocket connection pooling
- [ ] Database indexing optimization
- [ ] Query caching layer

### 🌍 Localization
- [ ] Multi-language support
- [ ] Language selection in settings
- [ ] RTL (Right-to-Left) support
- [ ] Currency/localization settings

### 📈 Analytics & Insights
- [ ] User activity tracking
- [ ] Match rate statistics
- [ ] Engagement metrics
- [ ] User retention dashboard
- [ ] A/B testing framework

---

## Quick Tips for Better Documentation:

1. **Keep it simple** - Use everyday words
2. **Add pictures** - Screenshots help a lot
3. **Code examples** - Show real working code
4. **Step-by-step** - Number the steps
5. **FAQ section** - Answer common questions
6. **Update regularly** - Keep docs matching the code

---

*This guide helps you create simple and clear documentation for your CrushRadar PWA!*

