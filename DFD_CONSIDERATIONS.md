# CrushRadar - Top-Level DFD Considerations

Based on code analysis, here are the key things to consider for a top-level Data Flow Diagram:

## 1. External Entities (External Agents)
- **User** - End-user interacting via React frontend (web browser)
- **Supabase Auth** - External authentication service (user registration/login)
- **Supabase Database** - External PostgreSQL database
- **Supabase Storage** - External storage for avatar images

## 2. Core Processes
| Process | Description |
|---------|-------------|
| Authentication | User signup, login, session management (email/password → JWT) |
| Profile Management | Create, read, update user profiles |
| Discover Users | Browse/search other users with filters |
| Crush Selection | Select/remove crushes anonymously |
| Auto-Match Detection | Database trigger automatically creates matches when mutual |
| View Matches | View mutual matches |

## 3. Key Data Stores (Tables)
- `profiles` - User profile information
- `crushes` - Anonymous crush selections
- `matches` - Mutual matches (created automatically)
- `hint_usage` - Tracks hint purchases
- `auth.users` - Supabase authentication (external)

## 4. Critical Data Flows
```
User → Auth → Supabase Auth → JWT Token
User → Profile Setup → profiles table
User → Discover ← profiles table
User → Select Crush → crushes table → Auto-Match Check → matches table
User → View Matches ← matches + profiles tables
```

## 5. Important DFD Considerations

### Security (RLS - Row Level Security)
- All tables have RLS policies enforced
- Users can ONLY see: own sent crushes, own matches, own profile
- Mutual matching happens automatically at database level via triggers
- Anonymity preserved - no access to who crushes on you

### Database Triggers (Backend Logic)
- `handle_new_user()` - Auto-creates profile on signup
- `check_and_create_match()` - Auto-creates match when crush is mutual

### External Integrations
- Supabase Auth for authentication
- Supabase Database for data storage
- Supabase Storage for avatar images
- Supabase Realtime for live updates

## 6. DFD Level-0 Structure

```
                    ┌─────────────────────┐
                    │   CRUSHRADAR APP    │
    ┌──────────────▶│                     │◀────────────┐
    │               │  1. Auth Service   │             │
    │               │  2. Profile Mgmt   │             │
    │               │  3. Discover Users │             │
    │               │  4. Crush Selection│             │
    │               │  5. Auto-Matching  │             │
    │               │  6. View Matches   │             │
    └───────────────┴─────────▲───────────┘             │
                              │                           │
                    JWT Token │                           │ Profile/Crush Data
                              │                           ▼
                    ┌─────────────────┐     ┌─────────────────────┐
                    │  Supabase Auth  │     │   Supabase DB       │
                    │  (Ext System)   │     │  - profiles         │
                    └─────────────────┘     │  - crushes          │
                                            │  - matches          │
                                            │  - hint_usage       │
                                            └─────────────────────┘
```

## 7. Frontend Pages (Data Entry Points)
- `/` - Landing page
- `/auth` - Authentication (login/signup)
- `/profile-setup` - Profile creation/update
- `/discover` - Browse and select crushes
- `/matches` - View mutual matches
- `/settings` - User settings

