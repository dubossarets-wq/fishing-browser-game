import type { WheelEvent } from 'react'
import { useGameStore } from '@/app/store'

function ReelIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={spinning ? 'animate-spin' : ''}
      style={{ width: 16, height: 16, animationDuration: '0.45s' }}
    >
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="2.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="17.5" x2="12" y2="21.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="2.5" y1="12" x2="6.5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="17.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
    </svg>
  )
}

function VerticalBar({ value, max = 100, color, label, danger }: { value: number; max?: number; color: string; label: string; danger?: boolean }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-mono text-paper-100 drop-shadow">{Math.round(value)}{max === 100 ? '%' : ''}</span>
      <div className={`w-4 h-40 rounded-full bg-black/45 overflow-hidden flex flex-col justify-end border border-black/30 ${danger ? 'animate-pulse-red' : ''}`}>
        <div className="w-full transition-[height] duration-150" style={{ height: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-paper-200 text-center leading-tight max-w-[52px] drop-shadow">{label}</span>
    </div>
  )
}

export function FightOverlay() {
  const activeRodIndex = useGameStore((s) => s.activeRodIndex)
  const rod = useGameStore((s) => s.rods[activeRodIndex])
  const fightInput = useGameStore((s) => s.fightInputs[activeRodIndex]) ?? { reeling: false, giveLine: false, drag: 40 }
  const setFightInput = useGameStore((s) => s.setFightInput)

  if (rod.state !== 'fight' || !rod.fight) return null
  const tensionDanger = rod.fight.lineTension > 80

  // Hold-while-pressed controls: track the release on window rather than
  // onPointerLeave, so dragging the cursor off the button (or out of the
  // browser window entirely) while still holding the mouse button doesn't
  // cancel reeling — only actually releasing the button does.
  const holdWhilePressed = (patch: { reeling?: boolean; giveLine?: boolean }, releasePatch: { reeling?: boolean; giveLine?: boolean }) => {
    setFightInput(activeRodIndex, patch)
    const onUp = () => {
      setFightInput(activeRodIndex, releasePatch)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointerup', onUp)
  }

  const onWheelDrag = (e: WheelEvent) => {
    e.preventDefault()
    const step = e.deltaY < 0 ? 3 : -3
    const next = Math.min(100, Math.max(0, fightInput.drag + step))
    setFightInput(activeRodIndex, { drag: next })
  }

  return (
    <>
      {/* Fish vitals — vertical bars along the right edge, out of the way of the scene. */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex gap-3 items-end bg-black/25 backdrop-blur-[1px] rounded-sm p-2.5">
        <VerticalBar value={rod.fight.lineTension} color={tensionDanger ? '#e8443a' : '#c9a24b'} label="Натяжение" danger={tensionDanger} />
        <VerticalBar value={rod.fight.fishStamina} color="#5a7c4a" label="Стамина рыбы" />
        <VerticalBar value={rod.fight.lineOut} max={rod.fight.maxLineOut} color="#4f8fa6" label="Леска на воде" />
      </div>

      {/* Controls — where the cast/strike button normally sits. */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 w-[340px]" onWheel={onWheelDrag}>
        <div className="panel-wood rounded-sm p-3 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-paper-300">Фрикцион: {fightInput.drag} <span className="opacity-50">(колесо мыши)</span></span>
            <span className="text-[10px] uppercase text-paper-300">{rod.fight.phase}</span>
          </div>
          <input
            type="range" min={0} max={100} value={fightInput.drag}
            onChange={(e) => setFightInput(activeRodIndex, { drag: Number(e.target.value) })}
            className="w-full accent-brass-500 mb-2.5"
          />
          <div className="flex gap-2">
            <button
              onPointerDown={() => holdWhilePressed({ reeling: true, giveLine: false }, { reeling: false })}
              className={`flex-1 py-2 rounded-sm text-sm font-semibold select-none flex items-center justify-center gap-1.5 ${fightInput.reeling ? 'bg-brass-500 text-wood-950' : 'btn-brass'}`}
            >
              <ReelIcon spinning={fightInput.reeling} />
              Подматывать
            </button>
            <button
              onPointerDown={() => holdWhilePressed({ giveLine: true, reeling: false }, { giveLine: false })}
              className={`flex-1 py-2 rounded-sm text-sm font-semibold select-none border border-paper-300/30 ${fightInput.giveLine ? 'bg-lake-600 text-paper-100' : 'bg-black/25 text-paper-100 hover:bg-black/40'}`}
            >
              Отпустить леску
            </button>
          </div>
          {tensionDanger && <div className="text-[11px] text-ember-500 mt-2 text-center animate-pulse-red">Опасное натяжение!</div>}
        </div>
      </div>
    </>
  )
}
