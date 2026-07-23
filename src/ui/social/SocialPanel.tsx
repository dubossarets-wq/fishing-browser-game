import { useState } from 'react'
import { useGameStore } from '@/app/store'
import { useUiStore } from '@/app/uiStore'
import { useNetworkStore } from '@/app/networkStore'

const EVENT_COLORS: Record<string, string> = {
  info: 'text-paper-300', catch: 'text-moss-500', weather: 'text-lake-400',
  market: 'text-brass-400', quest: 'text-brass-500', warning: 'text-ember-500',
}

export function SocialPanel() {
  const socialTab = useUiStore((s) => s.socialTab)
  const setSocialTab = useUiStore((s) => s.setSocialTab)
  const openModal = useUiStore((s) => s.openModal)
  const chatMessages = useGameStore((s) => s.chatMessages)
  const onlinePlayers = useGameStore((s) => s.onlinePlayers)
  const events = useGameStore((s) => s.events)
  const sendChatMessage = useGameStore((s) => s.sendChatMessage)

  const netStatus = useNetworkStore((s) => s.status)
  const remoteMessages = useNetworkStore((s) => s.remoteMessages)
  const remotePlayers = useNetworkStore((s) => s.remotePlayers)
  const leaderboard = useNetworkStore((s) => s.leaderboard)
  const sendRemoteMessage = useNetworkStore((s) => s.sendMessage)
  const logout = useNetworkStore((s) => s.logout)

  const [draft, setDraft] = useState('')
  const isOnline = netStatus === 'online'

  const submit = () => {
    if (!draft.trim()) return
    if (isOnline) void sendRemoteMessage(draft.trim())
    else sendChatMessage(draft.trim())
    setDraft('')
  }

  return (
    <div className="panel-wood flex flex-col text-paper-100 border-t-2 border-black/40 h-full min-h-0">
      <div className="flex items-center justify-between px-2 py-1 border-b border-black/30 text-[11px]">
        <span className={isOnline ? 'text-moss-500' : 'text-paper-300'}>
          {isOnline ? '● онлайн' : netStatus === 'unconfigured' ? 'офлайн-режим' : '○ не в сети'}
        </span>
        {isOnline ? (
          <button onClick={() => void logout()} className="underline opacity-70 hover:opacity-100">выйти</button>
        ) : (
          <button onClick={() => openModal('auth')} className="underline opacity-70 hover:opacity-100">
            {netStatus === 'unconfigured' ? 'о статусе' : 'войти'}
          </button>
        )}
      </div>

      <div className="flex text-xs border-b border-black/30">
        {(['chat', 'players', 'events', 'leaderboard'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSocialTab(tab)}
            className={`flex-1 py-1.5 ${socialTab === tab ? 'bg-black/25 font-semibold' : 'hover:bg-black/15'}`}
          >
            {tab === 'chat' ? 'Чат' : tab === 'players' ? 'Игроки' : tab === 'events' ? 'События' : 'Топ'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2 text-xs space-y-1 min-h-0">
        {socialTab === 'chat' && (isOnline
          ? remoteMessages.map((m) => (
              <div key={m.id}><span className="text-brass-400 font-semibold">{m.username}: </span><span className="text-paper-200">{m.text}</span></div>
            ))
          : chatMessages.map((m) => (
              <div key={m.id}><span className="text-brass-400 font-semibold">{m.author}: </span><span className="text-paper-200">{m.text}</span></div>
            ))
        )}
        {socialTab === 'players' && (isOnline
          ? remotePlayers.map((p) => (
              <div key={p.userId} className="flex justify-between">
                <span>{p.username}</span>
                <span className="opacity-60">ур. {p.level}</span>
              </div>
            ))
          : onlinePlayers.map((p) => (
              <div key={p.name} className="flex justify-between">
                <span>{p.name}</span>
                <span className="opacity-60">{p.fishCount} рыб</span>
              </div>
            ))
        )}
        {socialTab === 'events' && events.slice().reverse().map((e) => (
          <div key={e.id} className={EVENT_COLORS[e.kind]}>{e.text}</div>
        ))}
        {socialTab === 'leaderboard' && (
          isOnline ? (
            leaderboard.length ? leaderboard.map((p, i) => (
              <div key={p.id} className="flex justify-between">
                <span>{i + 1}. {p.username}</span>
                <span className="opacity-60">{p.biggest_fish_weight ? `${p.biggest_fish_weight} кг` : '—'}</span>
              </div>
            )) : <div className="opacity-50 italic">Пока никто не поймал трофей</div>
          ) : <div className="opacity-50 italic">Доступно в онлайн-режиме</div>
        )}
      </div>

      {socialTab === 'chat' && (
        <div className="flex gap-1 p-2 border-t border-black/30">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Сообщение…"
            className="flex-1 min-w-0 bg-black/25 rounded-sm px-2 py-1 text-xs outline-none placeholder:opacity-40"
          />
          <button onClick={submit} className="text-xs px-2 py-1 rounded-sm btn-brass">➤</button>
        </div>
      )}
    </div>
  )
}
