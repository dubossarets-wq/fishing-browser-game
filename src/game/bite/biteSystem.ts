import type { FishSpecies, TimeOfDay, WeatherKind } from '@/game/fish/types'
import type { RodLoadout } from '@/game/equipment/types'
import type { BiteStage } from '@/game/fishing/types'
import type { DepthPoint } from '@/game/locations/types'

export interface BiteContext {
  species: FishSpecies[]
  depthPoint: DepthPoint
  timeOfDay: TimeOfDay
  weather: WeatherKind
  temperature: number
  pressureTrend: 'rising' | 'falling' | 'stable'
  loadout: RodLoadout
  spotActivityMultiplier: number
  groundbaitBonus: number // 0-1, additional attraction from prior chumming
  rng: () => number
}

export interface SpeciesScore {
  species: FishSpecies
  score: number // 0-1 suitability under current conditions
}

const RARITY_WEIGHT: Record<FishSpecies['rarity'], number> = {
  common: 1.0,
  uncommon: 0.55,
  rare: 0.28,
  epic: 0.1,
  legendary: 0.035,
}

export function scoreSpecies(species: FishSpecies, ctx: BiteContext): number {
  const { depthPoint, timeOfDay, weather, temperature, loadout } = ctx

  const [depthMin, depthMax] = species.preferredDepth
  const depthMid = (depthMin + depthMax) / 2
  const depthSpread = Math.max(0.5, (depthMax - depthMin) / 2)
  const depthDelta = Math.abs(depthPoint.depth - depthMid)
  const depthScore = clamp01(1 - depthDelta / (depthSpread * 2.2))
  if (depthPoint.depth < depthMin - depthSpread || depthPoint.depth > depthMax + depthSpread) return 0

  const bottomScore = species.preferredBottom.includes(depthPoint.bottom) ? 1 : 0.35
  const timeScore = species.preferredTime.includes(timeOfDay) ? 1 : 0.4
  const weatherScore = species.preferredWeather.includes(weather) ? 1 : 0.6

  const [tempMin, tempMax] = species.preferredTemperature
  const tempMid = (tempMin + tempMax) / 2
  const tempSpread = Math.max(2, (tempMax - tempMin) / 2)
  const tempScore = clamp01(1 - Math.abs(temperature - tempMid) / (tempSpread * 1.8))

  const baitScore = loadout.bait && species.preferredBaits.includes(loadout.bait) ? 1 : 0.25

  const composite =
    depthScore * 0.28 +
    bottomScore * 0.16 +
    timeScore * 0.16 +
    weatherScore * 0.1 +
    tempScore * 0.14 +
    baitScore * 0.16

  return clamp01(composite) * RARITY_WEIGHT[species.rarity]
}

export function rankCandidates(ctx: BiteContext): SpeciesScore[] {
  return ctx.species
    .map((species) => ({ species, score: scoreSpecies(species, ctx) }))
    .filter((s) => s.score > 0.02)
    .sort((a, b) => b.score - a.score)
}

export function pickWeightedSpecies(candidates: SpeciesScore[], rng: () => number): SpeciesScore | null {
  if (candidates.length === 0) return null
  const total = candidates.reduce((sum, c) => sum + c.score, 0)
  let r = rng() * total
  for (const c of candidates) {
    r -= c.score
    if (r <= 0) return c
  }
  return candidates[0]
}

function lineStealthPenalty(loadout: RodLoadout): number {
  const visibility = loadout.line?.visibility ?? 50
  return clamp01(1 - visibility / 220)
}

function hookFitScore(species: FishSpecies, loadout: RodLoadout): number {
  const hookSize = loadout.hook?.size ?? 8
  const idealSize = clamp(4 + Math.log2(1 + species.averageWeight) * 3, 4, 20)
  const delta = Math.abs(hookSize - idealSize)
  return clamp01(1 - delta / 10)
}

interface BiteTiming {
  nibbleWindowMs: number
  strikeWindowMs: number
  commitProbMultiplier: number
}

// Different species take the bait differently: explosive predator strikes give
// almost no reaction time, bottom feeders like carp/bream mouth it cautiously
// for much longer before committing.
function getBiteTiming(biteStyle: FishSpecies['biteStyle']): BiteTiming {
  switch (biteStyle) {
    case 'spin-strike':
      return { nibbleWindowMs: 2200, strikeWindowMs: 1400, commitProbMultiplier: 1.3 }
    case 'float-plunge':
      return { nibbleWindowMs: 7000, strikeWindowMs: 2600, commitProbMultiplier: 0.85 }
    case 'feeder-tap':
      return { nibbleWindowMs: 9000, strikeWindowMs: 3600, commitProbMultiplier: 0.7 }
    case 'float-drag':
      return { nibbleWindowMs: 6000, strikeWindowMs: 2400, commitProbMultiplier: 0.9 }
    case 'float-twitch':
    default:
      return { nibbleWindowMs: 5000, strikeWindowMs: 2000, commitProbMultiplier: 1 }
  }
}

export interface BiteTickResult {
  nextStage: BiteStage
  candidateSpeciesId: string | null
  event?: 'attracted' | 'nibbling' | 'strong-bite' | 'missed-strike-window' | 'spooked'
}

const STAGE_TICK_MS = 250

export function tickBite(
  stage: BiteStage,
  timerMs: number,
  candidateSpeciesId: string | null,
  ctx: BiteContext,
): BiteTickResult {
  const rng = ctx.rng

  switch (stage) {
    case 'none': {
      const candidates = rankCandidates(ctx)
      const activity = ctx.spotActivityMultiplier * (1 + ctx.groundbaitBonus * 0.6)
      const totalAttraction = candidates.reduce((s, c) => s + c.score, 0)
      const stealth = lineStealthPenalty(ctx.loadout)
      const baseTickProb = clamp01(totalAttraction * 0.03 * activity * stealth)
      if (rng() < baseTickProb) {
        const picked = pickWeightedSpecies(candidates, rng)
        if (picked) {
          return { nextStage: 'interested', candidateSpeciesId: picked.species.id, event: 'attracted' }
        }
      }
      return { nextStage: 'none', candidateSpeciesId: null }
    }

    case 'interested': {
      if (!candidateSpeciesId) return { nextStage: 'none', candidateSpeciesId: null }
      const species = ctx.species.find((s) => s.id === candidateSpeciesId)
      if (!species) return { nextStage: 'none', candidateSpeciesId: null }

      const baitScore = ctx.loadout.bait && species.preferredBaits.includes(ctx.loadout.bait) ? 1 : 0.3
      const progressProb = clamp01(0.18 * baitScore)
      const stealth = lineStealthPenalty(ctx.loadout)
      const spookProb = clamp01(0.15 * (1 - stealth))

      if (timerMs > 12000) return { nextStage: 'none', candidateSpeciesId: null, event: 'spooked' }
      if (rng() < spookProb) return { nextStage: 'none', candidateSpeciesId: null, event: 'spooked' }
      if (rng() < progressProb) return { nextStage: 'nibble', candidateSpeciesId, event: 'nibbling' }
      return { nextStage: 'interested', candidateSpeciesId }
    }

    case 'nibble': {
      if (!candidateSpeciesId) return { nextStage: 'none', candidateSpeciesId: null }
      const species = ctx.species.find((s) => s.id === candidateSpeciesId)
      if (!species) return { nextStage: 'none', candidateSpeciesId: null }

      const timing = getBiteTiming(species.biteStyle)
      const fit = hookFitScore(species, ctx.loadout)
      const commitProb = clamp01(0.16 * timing.commitProbMultiplier * (0.4 + fit * 0.6))
      // A cautious fish can drop the bait entirely instead of committing — more
      // likely the longer it lingers and the poorer the hook fit.
      const dropProb = clamp01(0.05 * (1 - fit) + (timerMs / timing.nibbleWindowMs) * 0.03)

      if (timerMs > timing.nibbleWindowMs) return { nextStage: 'none', candidateSpeciesId: null }
      if (rng() < dropProb) return { nextStage: 'none', candidateSpeciesId: null }
      if (rng() < commitProb) return { nextStage: 'strong-bite', candidateSpeciesId, event: 'strong-bite' }
      return { nextStage: 'nibble', candidateSpeciesId }
    }

    case 'strong-bite': {
      if (!candidateSpeciesId) return { nextStage: 'none', candidateSpeciesId: null }
      const species = ctx.species.find((s) => s.id === candidateSpeciesId)
      const timing = getBiteTiming(species?.biteStyle ?? 'float-twitch')
      if (timerMs > timing.strikeWindowMs) {
        return { nextStage: 'none', candidateSpeciesId: null, event: 'missed-strike-window' }
      }
      return { nextStage: 'strong-bite', candidateSpeciesId }
    }

    case 'hooked':
      return { nextStage: 'hooked', candidateSpeciesId }

    default:
      return { nextStage: 'none', candidateSpeciesId: null }
  }
}

export function rollFishWeight(species: FishSpecies, rng: () => number): { weight: number; isTrophy: boolean } {
  // Skewed distribution: small common, large rare, using an exponential-ish shape.
  const u = rng()
  const shaped = Math.pow(u, 2.6) // bias toward 0 (small fish)
  const span = species.maxWeight - species.minWeight
  let weight = species.minWeight + span * shaped

  // rare chance to roll into trophy territory beyond maxWeight up to trophyWeight
  if (rng() < 0.015) {
    const trophySpan = species.trophyWeight - species.maxWeight
    weight = species.maxWeight + trophySpan * rng()
  }

  weight = Math.round(weight * 100) / 100
  return { weight, isTrophy: weight >= species.trophyWeight * 0.92 }
}

export { STAGE_TICK_MS }

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
