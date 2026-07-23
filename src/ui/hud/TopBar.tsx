import { useGameStore, formatGameClock, gameWeekday } from '@/app/store'
import { useUiStore } from '@/app/uiStore'
import { Button } from '@/ui/common/Panel'

export function TopBar() {
  const player = useGameStore((s) => s.player)
  const clock = useGameStore((s) => s.clock)
  const money = useGameStore((s) => s.economy.money)
  const livewell = useGameStore((s) => s.livewell)
  const livewellCount = livewell.length
  const livewellWeight = livewell.reduce((sum, f) => sum + f.weight, 0)
  const openBase = useUiStore((s) => s.openBase)
  const openModal = useUiStore((s) => s.openModal)
  const muted = useUiStore((s) => s.muted)
  const toggleMuted = useUiStore((s) => s.toggleMuted)

  return (
    <div className="panel-wood flex items-center gap-4 px-4 py-2 text-paper-100 text-sm border-b-2 border-black/40 z-20">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-brass-500 flex items-center justify-center text-wood-950 font-bold">
          {player.level}
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-paper-100">{player.name}</div>
          <div className="text-[11px] text-paper-300">
            ур. {player.level} <span className="text-brass-400">· {livewellWeight.toFixed(2)} кг</span>
          </div>
        </div>
      </div>

      <div className="h-8 w-px bg-black/30" />

      <div className="flex items-center gap-1 text-paper-200">
        <span className="text-brass-400">⚡</span>
        <div className="w-24 h-2 bg-black/40 rounded-full overflow-hidden">
          <div className="h-full bg-moss-500" style={{ width: `${player.energy}%` }} />
        </div>
      </div>

      <div className="h-8 w-px bg-black/30" />

      <div className="text-paper-200">
        {formatGameClock(clock)} <span className="text-paper-300">· {gameWeekday(clock)}</span>
      </div>

      <div className="flex-1" />

      <button
        onClick={() => openBase('livewell')}
        className="flex items-center gap-1 px-2 py-1 rounded-sm bg-black/25 hover:bg-black/40 transition text-paper-100"
        title="Садок"
      >
        🐟 <span>{livewellCount}</span>
      </button>

      <div className="flex items-center gap-1 px-2 py-1 rounded-sm bg-black/25 text-brass-400 font-semibold">
        {money.toLocaleString('ru-RU')} ₽
      </div>

      <Button variant="ghost" onClick={toggleMuted} title="Звук">
        {muted ? '🔇' : '🔊'}
      </Button>
      <Button variant="ghost" onClick={() => openModal('settings')} title="Настройки">⚙</Button>
      <Button variant="ghost" onClick={() => openModal('help')} title="Справка">?</Button>
      <Button variant="ghost" onClick={() => openModal('menu')} title="Меню">☰</Button>
    </div>
  )
}
