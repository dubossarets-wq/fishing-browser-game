import { supabase, type ChatMessageRow } from '@/engine/network/supabaseClient'

export async function fetchRecentMessages(limit = 30): Promise<ChatMessageRow[]> {
  if (!supabase) return []
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []).slice().reverse()
}

export async function sendChatMessageRemote(userId: string, username: string, text: string): Promise<void> {
  if (!supabase) return
  await supabase.from('chat_messages').insert({ user_id: userId, username, text })
}

export function subscribeToChat(onMessage: (row: ChatMessageRow) => void): () => void {
  const client = supabase
  if (!client) return () => {}
  const channel = client
    .channel('public:chat_messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      (payload) => onMessage(payload.new as ChatMessageRow),
    )
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}
