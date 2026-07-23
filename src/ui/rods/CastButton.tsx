import { useGameStore } from '@/app/store'
import { Button } from '@/ui/common/Panel'

export function CastButton() {
  const activeRodIndex = useGameStore((s) => s.activeRodIndex)
  const rod = useGameStore((s) => s.rods[activeRodIndex])
  const castRod = useGameStore((s) => s.castRod)
  const strike = useGameStore((s) => s.strike)
  const setFightInput = useGameStore((s) => s.setFightInput)
  const keepFish = useGameStore((s) => s.keepFish)
  const releaseFish = useGameStore((s) => s.releaseFish)

  const isBiting = rod.state === 'waiting' && rod.biteStage === 'strong-bite'

  if (rod.state !== 'ready' && !isBiting && rod.state !== 'caught') return null

  if (rod.state === 'caught') {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        <Button className="px-6 py-2.5 text-base shadow-xl" onClick={() => keepFish(activeRodIndex)}>
          В садок
        </Button>
        <Button variant="ghost" className="px-6 py-2.5 text-base shadow-xl" onClick={() => releaseFish(activeRodIndex)}>
          Отпустить
        </Button>
      </div>
    )
  }

  if (isBiting) {
    // Strike and keep holding: don't make the player release and re-press a
    // separate reel button — the same hold carries straight into reeling.
    const onStrikeDown = () => {
      strike(activeRodIndex)
      setFightInput(activeRodIndex, { reeling: true })
      const onUp = () => {
        setFightInput(activeRodIndex, { reeling: false })
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointerup', onUp)
    }
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <button
          onPointerDown={onStrikeDown}
          className="px-8 py-2.5 text-base font-semibold rounded-sm shadow-xl animate-pulse-red bg-ember-500 text-paper-100 border border-black/30 hover:brightness-110 active:brightness-90 transition select-none"
        >
          ПОДСЕЧКА!
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
      <Button className="px-8 py-2.5 text-base shadow-xl" onClick={() => castRod(activeRodIndex)}>
        Забросить
      </Button>
    </div>
  )
}
