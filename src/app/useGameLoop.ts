import { useEffect } from 'react'
import { useGameStore } from '@/app/store'
import { soundManager } from '@/engine/audio/soundManager'

const AUTOSAVE_INTERVAL_MS = 20000
const MAX_DT_MS = 250

export function useGameLoop() {
  const init = useGameStore((s) => s.init)
  const tick = useGameStore((s) => s.tick)
  const saveNow = useGameStore((s) => s.saveNow)

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    // Browsers refuse to play audio before a user gesture — unlock on the
    // very first interaction anywhere on the page so ambient sound and sfx
    // are ready as soon as possible, not only after clicking a sound button.
    const unlock = () => {
      soundManager.unlock()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(MAX_DT_MS, now - last)
      last = now
      try {
        tick(dt)
      } catch (err) {
        // Never let one bad tick (e.g. a transient edge-case in bite/fight math)
        // permanently kill the whole game loop — log it and keep going.
        console.error('[useGameLoop] tick error, recovering next frame', err)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tick])

  useEffect(() => {
    const id = window.setInterval(() => {
      void saveNow()
    }, AUTOSAVE_INTERVAL_MS)
    const onUnload = () => { void saveNow() }
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [saveNow])
}
