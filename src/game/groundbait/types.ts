import type { FeedingType } from '@/game/fish/types'
import type { GroundbaitItem } from '@/game/equipment/types'

export interface GroundbaitZone {
  id: string
  locationId: string
  centerDistance: number // metres from shore
  centerAngle: number // -1..1
  radius: number // metres, effective attraction radius
  foodAmount: number // 0-100, remaining food in the zone
  mixId: string
  createdAtGameMinute: number
  lastFedAtGameMinute: number
  // Per-species "how settled in" this zone is — climbs toward 1 as fish spend
  // time nearby (see groundbaitApproachSpeed), so attraction ramps up rather
  // than snapping on the instant food lands.
  settleProgress: Record<string, number>
}

export function createZone(
  locationId: string,
  distance: number,
  angle: number,
  mix: GroundbaitItem,
  nowMinute: number,
): GroundbaitZone {
  return {
    id: `${locationId}:${Math.round(distance)}:${Math.round(angle * 100)}:${nowMinute}`,
    locationId,
    centerDistance: distance,
    centerAngle: angle,
    radius: mix.spreadRadius,
    foodAmount: Math.min(100, mix.nutrition * 0.9 + mix.particleSize * 0.2),
    mixId: mix.id,
    createdAtGameMinute: nowMinute,
    lastFedAtGameMinute: nowMinute,
    settleProgress: {},
  }
}

const FEED_RADIUS_METERS = 6 // casts within this distance of a zone centre count as "in" it

export function findZoneNear(zones: GroundbaitZone[], locationId: string, distance: number, angle: number): GroundbaitZone | null {
  let best: GroundbaitZone | null = null
  let bestDist = Infinity
  for (const zone of zones) {
    if (zone.locationId !== locationId) continue
    const angularSpread = distance * Math.abs(angle - zone.centerAngle)
    const d = Math.hypot(distance - zone.centerDistance, angularSpread)
    if (d < FEED_RADIUS_METERS && d < bestDist) {
      best = zone
      bestDist = d
    }
  }
  return best
}

export function feedZone(
  zones: GroundbaitZone[],
  locationId: string,
  distance: number,
  angle: number,
  mix: GroundbaitItem,
  nowMinute: number,
): GroundbaitZone[] {
  const existing = findZoneNear(zones, locationId, distance, angle)
  if (existing) {
    const nutritionAdded = mix.nutrition * 0.6 + mix.particleSize * 0.15
    return zones.map((z) =>
      z.id === existing.id
        ? { ...z, foodAmount: Math.min(100, z.foodAmount + nutritionAdded), lastFedAtGameMinute: nowMinute, radius: Math.max(z.radius, mix.spreadRadius) }
        : z,
    )
  }
  return [...zones, createZone(locationId, distance, angle, mix, nowMinute)]
}

/** Decays food, drifts the zone downstream, and drops zones that have fully broken down. */
export function tickZones(zones: GroundbaitZone[], gameMinutesElapsed: number, currentSpeed: number, mixLookup: (id: string) => GroundbaitItem | undefined): GroundbaitZone[] {
  if (gameMinutesElapsed <= 0) return zones
  const gameHours = gameMinutesElapsed / 60
  const next: GroundbaitZone[] = []
  for (const zone of zones) {
    const mix = mixLookup(zone.mixId)
    const breakdownRate = mix?.breakdownRate ?? 50
    const decay = breakdownRate * 0.35 * gameHours
    const foodAmount = Math.max(0, zone.foodAmount - decay)
    if (foodAmount <= 0.5) continue // fully spent, remove

    // Current sweeps the scent/particles slowly downstream (further out).
    const driftDistance = (currentSpeed / 100) * 0.4 * gameHours
    const centerDistance = zone.centerDistance + driftDistance

    next.push({ ...zone, foodAmount, centerDistance })
  }
  return next
}

/** 0-1 zone strength for a given feeding-ecology group, factoring in overfeeding. */
export function zoneAttractionForFeedingType(zone: GroundbaitZone, feedingType: FeedingType, mixLookup: (id: string) => GroundbaitItem | undefined): number {
  const mix = mixLookup(zone.mixId)
  if (!mix) return 0
  const affinity = (mix.speciesAffinity[feedingType] ?? 10) / 100
  // Attraction ramps up quickly with food amount, then mildly tapers past ~85
  // (overfeeding) — fish are still around but less eager to actually bite.
  const foodCurve = zone.foodAmount <= 85
    ? zone.foodAmount / 85
    : 1 - ((zone.foodAmount - 85) / 15) * 0.35
  return Math.max(0, Math.min(1, affinity * foodCurve))
}

/** How "settled" a species is into this zone, 0-1 — climbs over real elapsed
 * time based on how quickly that species tends to approach a food source. */
export function tickSettleProgress(zone: GroundbaitZone, speciesId: string, approachSpeed: number, gameMinutesElapsed: number): number {
  const current = zone.settleProgress[speciesId] ?? 0
  const rate = 0.02 + (approachSpeed / 100) * 0.18 // per game-minute
  return Math.min(1, current + rate * gameMinutesElapsed)
}
