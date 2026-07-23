import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, type ProfileRow } from '@/engine/network/supabaseClient'

export interface AuthResult {
  ok: boolean
  error?: string
}

export async function signUp(email: string, password: string, username: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Онлайн-режим не настроен (нет ключей Supabase).' }
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { ok: false, error: error.message }
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, username, level: 1, total_fish: 0, total_weight_kg: 0 })
    if (profileError) return { ok: false, error: profileError.message }
  }
  return { ok: true }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Онлайн-режим не настроен (нет ключей Supabase).' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  return data
}

export async function upsertProfileStats(
  userId: string,
  patch: Partial<Pick<ProfileRow, 'username' | 'level' | 'total_fish' | 'total_weight_kg' | 'biggest_fish_species' | 'biggest_fish_weight'>>,
): Promise<void> {
  if (!supabase) return
  await supabase.from('profiles').upsert({ id: userId, updated_at: new Date().toISOString(), ...patch })
}

export async function fetchLeaderboard(limit = 20): Promise<ProfileRow[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('biggest_fish_weight', { ascending: false, nullsFirst: false })
    .limit(limit)
  return data ?? []
}

export { isSupabaseConfigured }
