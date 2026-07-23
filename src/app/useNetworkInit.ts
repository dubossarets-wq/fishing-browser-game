import { useEffect, useRef } from 'react'
import { useNetworkStore } from '@/app/networkStore'
import { useGameStore } from '@/app/store'

export function useNetworkInit() {
  const init = useNetworkStore((s) => s.init)
  const pushProfileStats = useNetworkStore((s) => s.pushProfileStats)
  const status = useNetworkStore((s) => s.status)

  useEffect(() => {
    void init()
  }, [init])

  const lastSyncRef = useRef(0)

  useEffect(() => {
    if (status !== 'online') return
    const unsub = useGameStore.subscribe((state) => {
      const now = Date.now()
      if (now - lastSyncRef.current < 4000) return
      lastSyncRef.current = now
      void pushProfileStats({
        username: state.player.name,
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
