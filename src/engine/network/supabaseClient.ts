import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, anonKey!) : null

export interface ProfileRow {
  id: string
  username: string
  level: number
  total_fish: number
  total_weight_kg: number
  biggest_fish_species: string | null
  biggest_fish_weight: number | null
  updated_at: string
}

export interface ChatMessageRow {
  id: number
  user_id: string
  username: string
  text: string
  created_at: string
}
