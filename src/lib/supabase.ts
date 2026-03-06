import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// PWA-optimized Supabase client configuration
// Uses IndexedDB for session storage (more reliable for PWAs than localStorage)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session to storage (true by default, but explicit for clarity)
    persistSession: true,
    
    // Automatically refresh the access token before it expires
    autoRefreshToken: true,
    
    // Storage adapter - use localStorage as fallback (IndexedDB not available in all contexts)
    // For PWAs, the default storage detects IndexedDB support automatically
    storage: {
      getItem: (key: string) => {
        if (typeof window === 'undefined') return null
        return localStorage.getItem(key)
      },
      setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return
        try {
          localStorage.setItem(key, value)
        } catch (e) {
          console.error('Error saving to localStorage:', e)
        }
      },
      removeItem: (key: string) => {
        if (typeof window === 'undefined') return
        localStorage.removeItem(key)
      }
    },
    
    // Detection of client type for PWA
    detectSessionInUrl: true, // Important for OAuth redirects in PWAs
  }
})

// Database types based on your schema
export interface Profile {
  id: string
  email: string
  name: string
  avatar_url?: string
  gender?: 'male' | 'female' | 'other' | 'prefer-not'
  class?: string
  batch?: string
  hints_remaining: number
  created_at: string
  updated_at: string
}

export interface Crush {
  id: string
  sender_id: string
  receiver_id: string
  created_at: string
}

export interface Match {
  id: string
  user1_id: string
  user2_id: string
  matched_at: string
}

export interface HintUsage {
  id: string
  user_id: string
  hint_type: 'name_initial' | 'class_batch' | 'avatar_blur'
  used_at: string
}
