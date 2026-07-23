import type { BaitItem, BaitBuoyancy } from '@/game/equipment/types'
import type { FeedingType } from '@/game/fish/types'

/** Freshness decays only while the bait is actually out in the water on a live cast. */
export function computeBaitFreshness(bait: BaitItem, gameMinutesInWater: number): number {
  const gameHours = gameMinutesInWater / 60
  return Math.max(0, 100 - bait.freshnessDecayPerGameHour * gameHours * 10)
}

export function freshnessMultiplier(freshness: number): number {
  // A stale bait still works, just noticeably worse — never fully dead so the
  // player isn't punished into a hard wall, just nudged to re-bait.
  return 0.4 + (freshness / 100) * 0.6
}

export interface EffectiveBait {
  size: number
  smell: number
  naturalness: number
  movement: number
  attractiveness: number
  buoyancy: BaitBuoyancy
  targetFeedingTypes: FeedingType[]
  temperatureRange: [number, number]
}

/** Combines a primary bait with an optional second "sandwich" component. */
export function computeEffectiveBait(primary: BaitItem, secondary: BaitItem | null): EffectiveBait {
  if (!secondary) {
    return {
      size: primary.size, smell: primary.smell, naturalness: primary.naturalness,
      movement: primary.movement, attractiveness: primary.attractiveness, buoyancy: primary.buoyancy,
      targetFeedingTypes: primary.targetFeedingTypes, temperatureRange: primary.temperatureRange,
    }
  }
  // Combos add bulk and a broader scent profile but with diminishing returns —
  // stacking two strong-smelling components isn't simply additive.
  const size = Math.min(100, primary.size + secondary.size * 0.5)
  const smell = Math.min(100, Math.max(primary.smell, secondary.smell) + Math.min(primary.smell, secondary.smell) * 0.3)
  const naturalness = (primary.naturalness + secondary.naturalness) / 2
  const movement = Math.max(primary.movement, secondary.movement)
  const attractiveness = Math.min(100, (primary.attractiveness + secondary.attractiveness) / 2 + 8)
  const targetFeedingTypes = Array.from(new Set([...primary.targetFeedingTypes, ...secondary.targetFeedingTypes]))
  const temperatureRange: [number, number] = [
    Math.min(primary.temperatureRange[0], secondary.temperatureRange[0]),
    Math.max(primary.temperatureRange[1], secondary.temperatureRange[1]),
  ]
  return { size, smell, naturalness, movement, attractiveness, buoyancy: primary.buoyancy, targetFeedingTypes, temperatureRange }
}
