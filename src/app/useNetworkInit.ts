import { useEffect, useRef } from 'react'
import { useNetworkStore } from '@/app/networkStore'
import { useGameStore } from '@/app/store'

export function useNetworkInit() {
  const init = useNetworkStore((s) => s.init)
  const pushProfileStats = useNetworkStore((s) => s.pushProfileStats)
  const status = useNetworkStore((s) => s.status)

  useEffect(() => {
    void init()

    // Stale/expired Supabase confirmation or recovery links land here as a
    // URL hash (e.g. #error=access_denied&error_code=otp_expired) rather
    // than a route — clear it so it doesn't linger in the address bar, and
    // let the player know the link itself was the problem, not the game.
    if (window.location.hash.includes('error=')) {
      const params = new URLSearchParams(window.location.hash.slice(1))
      if (params.get('error_code') === 'otp_expired') {
        useGameStore.getState().pushEvent('Ссылка из письма устарела — запросите новое письмо в окне входа.', 'warning')
      } else if (params.get('error')) {
        useGameStore.getState().pushEvent('Ссылка из письма недействительна.', 'warning')
      }
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [init])

  const lastSyncRef = useRef(0)

  useEffect(() => {
    if (status !== 'online') return
    const unsub = useGameStore.subscribe((state) => {
      const now = Date.now()
      if (now - lastSyncRef.current < 4000) return
      lastSyncRef.current = now
      void pushProfileStats({
        level: state.player.level,
        total_fish: state.stats.totalFishCaught,
        total_weight_kg: state.stats.totalWeightKg,
        biggest_fish_species: state.stats.biggestFish?.speciesId ?? null,
        biggest_fish_weight: state.stats.biggestFish?.weight ?? null,
      })
    })
    return unsub
  }, [status, pushProfileStats])
}
