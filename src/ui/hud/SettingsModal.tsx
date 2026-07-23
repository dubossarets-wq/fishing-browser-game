import { useState } from 'react'
import { useUiStore } from '@/app/uiStore'
import { useGameStore } from '@/app/store'
import { soundManager } from '@/engine/audio/soundManager'
import { Button, Panel } from '@/ui/common/Panel'

export function SettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal)
  const openModal = useUiStore((s) => s.openModal)
  const volume = useUiStore((s) => s.volume)
  const setVolume = useUiStore((s) => s.setVolume)
  const muted = useUiStore((s) => s.muted)
  const toggleMuted = useUiStore((s) => s.toggleMuted)
  const isAdmin = useGameStore((s) => s.admin.isAdmin)
  const unlockAdmin = useGameStore((s) => s.unlockAdmin)

  const [devOpen, setDevOpen] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)

  const submitCode = () => {
    if (unlockAdmin(code.trim())) {
      setCode('')
      setCodeError(false)
      setDevOpen(false)
    } else {
      setCodeError(true)
    }
  }

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

          <div className="mt-5 pt-3 border-t border-black/10 text-center">
            {isAdmin ? (
              <button
                onClick={() => { closeModal(); openModal('admin') }}
                className="text-[11px] text-brass-500 underline opacity-70 hover:opacity-100"
              >
                Панель разработчика
              </button>
            ) : devOpen ? (
              <div className="flex gap-1.5 justify-center">
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setCodeError(false) }}
                  onKeyDown={(e) => e.key === 'Enter' && submitCode()}
                  placeholder="код"
                  autoFocus
                  className={`text-xs px-2 py-1 rounded-sm border bg-black/5 outline-none ${codeError ? 'border-ember-500' : 'border-black/10'}`}
                />
                <button onClick={submitCode} className="text-xs px-2 py-1 rounded-sm bg-black/10 hover:bg-black/20">OK</button>
              </div>
            ) : (
              <button onClick={() => setDevOpen(true)} className="text-[10px] opacity-25 hover:opacity-50">·</button>
            )}
          </div>
        </div>
      </Panel>
    </div>
  )
}
