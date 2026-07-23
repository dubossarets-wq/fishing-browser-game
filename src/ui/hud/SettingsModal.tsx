import { useUiStore } from '@/app/uiStore'
import { soundManager } from '@/engine/audio/soundManager'
import { Button, Panel } from '@/ui/common/Panel'

export function SettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal)
  const volume = useUiStore((s) => s.volume)
  const setVolume = useUiStore((s) => s.setVolume)
  const muted = useUiStore((s) => s.muted)
  const toggleMuted = useUiStore((s) => s.toggleMuted)

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6" onClick={closeModal}>
      <Panel paper className="w-full max-w-sm p-5" >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Настройки</h2>
            <button onClick={closeModal} className="text-lg opacity-60 hover:opacity-100">✕</button>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold">Громкость игры</label>
              <span className="text-sm font-mono opacity-70">{muted ? 'выкл.' : `${volume}%`}</span>
            </div>
            <input
              type="range" min={0} max={100} value={volume} disabled={muted}
              onChange={(e) => {
                const v = Number(e.target.value)
                setVolume(v)
                soundManager.play('ui-click')
              }}
              className="w-full accent-brass-500 disabled:opacity-40"
            />
          </div>

          <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
            <span className="text-sm font-semibold">Без звука</span>
            <input type="checkbox" checked={muted} onChange={toggleMuted} className="w-4 h-4 accent-brass-500" />
          </label>

          <Button className="mt-5 w-full" onClick={closeModal}>Готово</Button>
        </div>
      </Panel>
    </div>
  )
}
