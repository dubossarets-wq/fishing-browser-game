import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/engine/network/supabaseClient'
import { useGameStore } from '@/app/store'
import { signIn, signUp, signOut, getSession, onAuthStateChange, fetchProfile, upsertProfileStats, fetchLeaderboard, resendConfirmation } from '@/engine/network/authService'
import { fetchRecentMessages, sendChatMessageRemote, subscribeToChat } from '@/engine/network/chatService'
import { joinPresence, type PresenceInfo } from '@/engine/network/presenceService'
import type { ChatMessageRow, ProfileRow } from '@/engine/network/supabaseClient'

export type NetworkStatus = 'unconfigured' | 'signed-out' | 'connecting' | 'online'

interface NetworkState {
  status: NetworkStatus
  session: Session | null
  profile: ProfileRow | null
  remoteMessages: ChatMessageRow[]
  remotePlayers: PresenceInfo[]
  leaderboard: ProfileRow[]
  authError: string | null

  init: () => Promise<void>
  register: (email: string, password: string, username: string) => Promise<boolean>
  resendConfirmation: (email: string) => Promise<boolean>
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  renameUsername: (name: string) => Promise<boolean>
  sendMessage: (text: string) => Promise<void>
  refreshLeaderboard: () => Promise<void>
  pushProfileStats: (patch: Partial<ProfileRow>) => Promise<void>
}

let stopChatSub: (() => void) | null = null
let stopPresence: (() => void) | null = null

export const useNetworkStore = create<NetworkState>((set, get) => ({
  status: isSupabaseConfigured ? 'connecting' : 'unconfigured',
  session: null,
  profile: null,
  remoteMessages: [],
  remotePlayers: [],
  leaderboard: [],
  authError: null,

  init: async () => {
    if (!isSupabaseConfigured) {
      set({ status: 'unconfigured' })
      return
    }
    const session = await getSession()
    if (session) {
      const profile = await fetchProfile(session.user.id)
      if (profile?.username) useGameStore.getState().setPlayerName(profile.username)
      set({ session, profile, status: 'online' })
      connectRealtime(session.user.id, profile?.username ?? 'Рыболов', profile?.level ?? 1, set)
    } else {
      set({ status: 'signed-out' })
    }
    onAuthStateChange(async (nextSession) => {
      if (nextSession) {
        const profile = await fetchProfile(nextSession.user.id)
        if (profile?.username) useGameStore.getState().setPlayerName(profile.username)
        set({ session: nextSession, profile, status: 'online', authError: null })
        connectRealtime(nextSession.user.id, profile?.username ?? 'Рыболов', profile?.level ?? 1, set)
      } else {
        stopChatSub?.()
        stopPresence?.()
        set({ session: null, profile: null, status: 'signed-out', remoteMessages: [], remotePlayers: [] })
      }
    })
    void get().refreshLeaderboard()
  },

  register: async (email, password, username) => {
    const res = await signUp(email, password, username)
    if (!res.ok) {
      set({ authError: res.error ?? 'Не удалось зарегистрироваться' })
      return false
    }
    set({ authError: null })
    return true
  },

  resendConfirmation: async (email) => {
    const res = await resendConfirmation(email)
    if (!res.ok) {
      set({ authError: res.error ?? 'Не удалось отправить письмо повторно' })
      return false
    }
    set({ authError: null })
    return true
  },

  login: async (email, password) => {
    const res = await signIn(email, password)
    if (!res.ok) {
      set({ authError: res.error ?? 'Не удалось войти' })
      return false
    }
    set({ authError: null })
    return true
  },

  logout: async () => {
    await signOut()
  },

  renameUsername: async (name) => {
    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 24) {
      set({ authError: 'Ник должен быть от 2 до 24 символов.' })
      return false
    }
    const { session, profile } = get()
    if (!session) return false
    await upsertProfileStats(session.user.id, { username: trimmed })
    useGameStore.getState().setPlayerName(trimmed)
    set({ profile: profile ? { ...profile, username: trimmed } : profile, authError: null })
    return true
  },

  sendMessage: async (text) => {
    const { session, profile } = get()
    if (!session) return
    await sendChatMessageRemote(session.user.id, profile?.username ?? 'Рыболов', text)
  },

  refreshLeaderboard: async () => {
    const leaderboard = await fetchLeaderboard(20)
    set({ leaderboard })
  },

  pushProfileStats: async (patch) => {
    const { session } = get()
    if (!session) return
    await upsertProfileStats(session.user.id, patch)
  },
}))

function connectRealtime(
  userId: string,
  username: string,
  level: number,
  set: (partial: Partial<NetworkState>) => void,
) {
  stopChatSub?.()
  stopPresence?.()

  void fetchRecentMessages(30).then((messages) => set({ remoteMessages: messages }))

  stopChatSub = subscribeToChat((row) => {
    set({ remoteMessages: [...useNetworkStore.getState().remoteMessages.slice(-49), row] })
  })

  stopPresence = joinPresence(userId, username, level, (players) => {
    set({ remotePlayers: players })
  })
}
