import { useGameStore } from '@/app/store'
import { useUiStore } from '@/app/uiStore'
import { getFishSpeciesById } from '@/data/fish/species'
import { getLocationById } from '@/data/locations/locations'
import { Button } from '@/ui/common/Panel'
import type { RodSlot, RodState } from '@/game/fishing/types'

const STATE_LABELS: Record<RodState, string> = {
  idle: 'Не готова', setup: 'Настройка', ready: 'Готова', cast: 'Заброс',
  waiting: 'Ожидание', bite: 'Клюёт!', hooked: 'Подсечка', fight: 'Вываживание',
  caught: 'Поймано!', broken: 'Обрыв',
}

function RodTab({ index }: { index: 0 | 1 | 2 }) {
  const rod = useGameStore((s) => s.rods[index])
  const active = useGameStore((s) => s.activeRodIndex === index)
  const setActiveRod = useGameStore((s) => s.setActiveRod)
  const isHot = rod.biteStage === 'strong-bite' || rod.state === 'fight' || rod.state === 'caught'
  return (
    <button
      onClick={() => setActiveRod(index)}
      className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-sm border text-xs min-w-[64px] transition ${
        active ? 'bg-brass-500 text-wood-950 border-brass-500 font-semibold' : 'bg-black/25 text-paper-100 border-black/30 hover:bg-black/40'
      } ${isHot ? 'animate-pulse-red' : ''}`}
    >
      <span>Удочка {index + 1}</span>
      <span className="opacity-80">{STATE_LABELS[rod.state]}</span>
    </button>
  )
}

function TackleSummary({ rod }: { rod: RodSlot }) {
  const items = [
    rod.loadout.rod?.name,
    rod.loadout.reel?.name,
    rod.loadout.line?.name,
    rod.loadout.hook?.name,
  ].filter(Boolean)
  return (
    <div className="text-[11px] leading-snug text-paper-300 max-w-[220px]">
      {items.length ? items.join(' · ') : 'Снасть не собрана'}
      <div className="text-paper-200">Наживка: {rod.loadout.bait ?? '—'}</div>
    </div>
  )
}

export function RodDock() {
  const activeRodIndex = useGameStore((s) => s.activeRodIndex)
  const rod = useGameStore((s) => s.rods[activeRodIndex])
  const currentLocationId = useGameStore((s) => s.currentLocationId)
  const setCastParams = useGameStore((s) => s.setCastParams)
  const finishSetup = useGameStore((s) => s.finishSetup)
  const acknowledgeBroken = useGameStore((s) => s.acknowledgeBroken)
  const openSetup = useUiStore((s) => s.openSetup)
  const inventory = useGameStore((s) => s.inventory)
  const eatFood = useGameStore((s) => s.eatFood)
  const useGroundbait = useGameStore((s) => s.useGroundbait)

  const loc = getLocationById(currentLocationId)
  const species = rod.hookedFish ? getFishSpeciesById(rod.hookedFish.speciesId) : rod.lastResultFish ? getFishSpeciesById(rod.lastResultFish.speciesId) : null

  const foodStacks = inventory.stacks.filter((s) => s.category === 'food')
  const groundbaitStacks = inventory.stacks.filter((s) => s.category === 'groundbait')

  return (
    <div className="panel-wood flex items-stretch gap-3 p-2 text-paper-100 border-t-2 border-black/40">
      <div className="flex items-center gap-1 px-2 border-r border-black/30">
        {foodStacks.map((s) => (
          <button key={s.id} onClick={() => eatFood(s.id)} title={`Съесть (${s.quantity})`} className="w-9 h-9 rounded-sm bg-black/25 hover:bg-black/40 text-lg flex items-center justify-center relative">
            🥪<span className="absolute -bottom-1 -right-1 text-[9px] bg-black/60 rounded px-1">{s.quantity}</span>
          </button>
        ))}
        {groundbaitStacks.map((s) => (
          <button key={s.id} onClick={() => useGroundbait(activeRodIndex, s.itemId)} title={`Прикормить (${s.quantity})`} className="w-9 h-9 rounded-sm bg-black/25 hover:bg-black/40 text-lg flex items-center justify-center relative">
            🧺<span className="absolute -bottom-1 -right-1 text-[9px] bg-black/60 rounded px-1">{s.quantity}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <RodTab index={0} />
        <RodTab index={1} />
        <RodTab index={2} />
      </div>

      <div className="w-px bg-black/30" />

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <TackleSummary rod={rod} />

        {(rod.state === 'idle' || rod.state === 'setup' || rod.state === 'ready') && (
          <>
            <div className="flex flex-col gap-1 flex-1 max-w-[280px]">
              <label className="text-[11px] text-paper-300">Дистанция: {rod.castDistance.toFixed(2)} м</label>
              <input
                type="range" min={2} max={loc ? loc.depthProfile[loc.depthProfile.length - 1].distance : 100} value={rod.castDistance}
                onChange={(e) => setCastParams(activeRodIndex, Number(e.target.value), rod.castAngle)}
                className="accent-brass-500"
              />
              <label className="text-[11px] text-paper-300">Направление: {rod.castAngle.toFixed(2)}</label>
              <input
                type="range" min={-1} max={1} step={0.05} value={rod.castAngle}
                onChange={(e) => setCastParams(activeRodIndex, rod.castDistance, Number(e.target.value))}
                className="accent-brass-500"
              />
            </div>
            {loc && (
              <div className="hidden xl:flex flex-col gap-1">
                {loc.spots.slice(0, 3).map((spot) => (
                  <button key={spot.id} onClick={() => setCastParams(activeRodIndex, spot.distance, spot.angle)} className="text-[11px] text-left px-2 py-0.5 rounded-sm bg-black/20 hover:bg-black/35">
                    {spot.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {rod.state === 'waiting' && (rod.biteStage === 'interested' || rod.biteStage === 'nibble') && (
          <div className="text-xs text-brass-400 font-semibold">Рыба у наживки…</div>
        )}
        {rod.state === 'fight' && rod.fight && (
          <div className="text-xs text-ember-500 font-semibold animate-pulse-red">Идёт вываживание — переключитесь на панель борьбы</div>
        )}
        {rod.state === 'caught' && species && rod.lastResultFish && (
          <div className="text-xs text-moss-500 font-semibold">
            Поймано: {species.name}, {rod.lastResultFish.weight} кг{rod.lastResultFish.isTrophy ? ' 🏆' : ''}
          </div>
        )}
        {rod.state === 'broken' && (
          <div className="text-xs text-ember-500 font-semibold">
            Обрыв: {rod.brokenReason === 'line' ? 'порвалась леска' : rod.brokenReason === 'hook' ? 'разогнулся крючок' : 'сломалось удилище'}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pl-2 border-l border-black/30">
        {(rod.state === 'idle' || rod.state === 'setup') && (
          <Button variant="ghost" onClick={() => openSetup(activeRodIndex)}>Настроить</Button>
        )}
        {rod.state === 'ready' && (
          <Button variant="ghost" onClick={() => openSetup(activeRodIndex)}>Снасть</Button>
        )}
        {rod.state === 'broken' && (
          <Button variant="ghost" onClick={() => acknowledgeBroken(activeRodIndex)}>Ок</Button>
        )}
        {rod.state === 'setup' && rod.loadout.rod && rod.loadout.reel && rod.loadout.line && rod.loadout.hook && rod.loadout.bait && (
          <Button onClick={() => finishSetup(activeRodIndex)}>Готово</Button>
        )}
      </div>
    </div>
  )
}
