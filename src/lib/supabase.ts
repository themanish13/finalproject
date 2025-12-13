import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
