import { supabase } from '@/engine/network/supabaseClient'

export interface PresenceInfo {
  userId: string
  username: string
  level: number
}

export function joinPresence(userId: string, username: string, level: number, onSync: (players: PresenceInfo[]) => void): () => void {
  const client = supabase
  if (!client) return () => {}

  const channel = client.channel('lobby-presence', { config: { presence: { key: userId } } })

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState<{ username: string; level: number }>()
    const players: PresenceInfo[] = Object.entries(state).map(([key, entries]) => ({
      userId: key,
      username: entries[0]?.username ?? 'Рыболов',
      level: entries[0]?.level ?? 1,
    }))
    onSync(players)
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ username, level })
    }
  })

  return () => {
    client.removeChannel(channel)
  }
}
