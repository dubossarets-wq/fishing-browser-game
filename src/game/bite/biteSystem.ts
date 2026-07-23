import type { FishSpecies, TimeOfDay, WeatherKind, Season } from '@/game/fish/types'
import type { RodLoadout, GroundbaitItem } from '@/game/equipment/types'
import type { BiteStage } from '@/game/fishing/types'
import type { DepthPoint } from '@/game/locations/types'
import type { GroundbaitZone } from '@/game/groundbait/types'
import { zoneAttractionForFeedingType, tickSettleProgress } from '@/game/groundbait/types'
import type { EffectiveBait } from '@/game/bait/baitSystem'
import { freshnessMultiplier } from '@/game/bait/baitSystem'

export interface BiteContext {
  species: FishSpecies[]
  depthPoint: DepthPoint
  timeOfDay: TimeOfDay
  weather: WeatherKind
  waterTemperature: number
  season: Season
  pressureTrend: 'rising' | 'falling' | 'stable'
  lightLevel: number // 0-1
  currentSpeed: number // 0-100
  loadout: RodLoadout
  effectiveBait: EffectiveBait | null
  baitFreshness: number // 0-100
  spotActivityMultiplier: number
  groundbaitZone: GroundbaitZone | null
  mixLookup: (id: string) => GroundbaitItem | undefined
  fishingPressure: number // 0-100 — recent casting pressure on this exact spot
  rng: () => number
}

export interface SpeciesScore {
  species: FishSpecies
  score: number // 0-1 suitability under current conditions
  breakdown: BiteScoreBreakdown
}

export interface BiteScoreBreakdown {
  presence: number
  activity: number
  attraction: number
  presentation: number
  caution: number
  total: number
}

const RARITY_WEIGHT: Record<FishSpecies['rarity'], number> = {
  common: 1.0,
  uncommon: 0.55,
  rare: 0.28,
  epic: 0.1,
  legendary: 0.035,
}

// ── Stage 1: is a fish of this species even plausibly in the zone? ──
function scorePresence(species: FishSpecies, ctx: BiteContext): number {
  const [depthMin, depthMax] = species.preferredDepth
  const depthMid = (depthMin + depthMax) / 2
  const depthSpread = Math.max(0.5, (depthMax - depthMin) / 2)
  const depthDelta = Math.abs(ctx.depthPoint.depth - depthMid)
  if (ctx.depthPoint.depth < depthMin - depthSpread || ctx.depthPoint.depth > depthMax + depthSpread) return 0
  const depthScore = clamp01(1 - depthDelta / (depthSpread * 2.2))

  const bottomScore = species.preferredBottom.includes(ctx.depthPoint.bottom) ? 1 : 0.35

  const current = ctx.currentSpeed
  const b = species.behavior
  const currentScore =
    b.preferredCurrent === 'any' ? 1 :
    b.preferredCurrent === 'still' ? clamp01(1 - current / 45) :
    b.preferredCurrent === 'slow' ? clamp01(1 - Math.abs(current - 20) / 35) :
    b.preferredCurrent === 'moderate' ? clamp01(1 - Math.abs(current - 45) / 35) :
    clamp01((current - 20) / 50) // fast

  return clamp01(depthScore * 0.5 + bottomScore * 0.3 + currentScore * 0.2)
}

// ── Stage 2: given it's around, how active/feeding is it right now? ──
function scoreActivity(species: FishSpecies, ctx: BiteContext): number {
  const b = species.behavior

  const tempSpread = Math.max(2, b.temperatureMax - b.temperatureOptimum, b.temperatureOptimum - b.temperatureMin)
  const tempDelta = Math.abs(ctx.waterTemperature - b.temperatureOptimum)
  const outOfHardRange = ctx.waterTemperature < b.temperatureMin || ctx.waterTemperature > b.temperatureMax
  const tempScore = outOfHardRange ? 0.05 : clamp01(1 - tempDelta / (tempSpread * 1.4))

  const seasonScore = b.seasonalActivity[ctx.season] ?? 0.5
  const spawningPenalty = b.spawningSeasons.includes(ctx.season) ? 0.45 : 1

  const timeScore = b.feedingIntensityByTime[ctx.timeOfDay] ?? 0.5

  const weatherMatch = species.preferredWeather.includes(ctx.weather) ? 1 : 0.55
  const weatherScore = 1 - (1 - weatherMatch) * (b.weatherSensitivity / 100)

  // Stable conditions generally beat sharp swings — not "low pressure = bad".
  const pressureScore = ctx.pressureTrend === 'stable'
    ? 1
    : 1 - 0.35 * (b.pressureSensitivity / 100)

  // High lightSensitivity species prefer dim conditions (dawn/dusk/night/overcast).
  const lightPreferenceScore = 1 - Math.abs((1 - ctx.lightLevel) - b.lightSensitivity / 100) * 0.6

  const composite =
    tempScore * 0.32 +
    seasonScore * 0.16 +
    timeScore * 0.24 +
    weatherScore * 0.1 +
    pressureScore * 0.1 +
    clamp01(lightPreferenceScore) * 0.08

  return clamp01(composite) * spawningPenalty
}

// ── Stage 3: does it notice and want the bait (direct appeal + groundbait pull)? ──
function scoreAttraction(species: FishSpecies, ctx: BiteContext): number {
  const b = species.behavior
  const bait = ctx.effectiveBait

  let baitScore = 0.2
  if (bait) {
    const typeMatch = bait.targetFeedingTypes.includes(b.feedingType) ? 1 : 0.35
    const smellFit = 1 - Math.abs(bait.smell - b.sensitivity.smell) / 140
    const sizeFit = clamp01(1 - Math.abs(bait.size - estimateIdealBaitSize(species)) / 70)
    const tempFit = ctx.waterTemperature >= bait.temperatureRange[0] && ctx.waterTemperature <= bait.temperatureRange[1] ? 1 : 0.6
    const freshnessScore = freshnessMultiplier(ctx.baitFreshness)
    baitScore = clamp01(typeMatch * 0.45 + clamp01(smellFit) * 0.2 + sizeFit * 0.15 + tempFit * 0.1) * freshnessScore
  }

  let groundbaitScore = 0
  if (ctx.groundbaitZone) {
    const zoneStrength = zoneAttractionForFeedingType(ctx.groundbaitZone, b.feedingType, ctx.mixLookup)
    const settle = ctx.groundbaitZone.settleProgress[species.id] ?? 0
    groundbaitScore = zoneStrength * (0.3 + settle * 0.7) * (b.groundbaitAffinity / 100)

    // Predators barely care about the groundbait itself, but a well-fed swarm
    // of peaceful fish nearby raises the odds a hunter is patrolling through.
    if (b.predatorType !== 'none') {
      groundbaitScore = zoneStrength * 0.6 * (b.indirectPreyResponse / 100)
    }
  }

  return clamp01(Math.max(baitScore, groundbaitScore * 0.9) + Math.min(baitScore, groundbaitScore) * 0.25)
}

function estimateIdealBaitSize(species: FishSpecies): number {
  return clamp(20 + Math.log2(1 + species.averageWeight) * 12, 10, 90)
}

// ── Stage 4: is the presentation (hook/line/leader) acceptable? ──
function scorePresentation(species: FishSpecies, ctx: BiteContext): number {
  const b = species.behavior
  const hookSize = ctx.loadout.hook?.size ?? 8
  const idealHook = clamp(4 + Math.log2(1 + species.averageWeight) * 3, 4, 20)
  const hookFit = clamp01(1 - Math.abs(hookSize - idealHook) / 10)

  const lineVisibility = ctx.loadout.leader?.visibility ?? ctx.loadout.line?.visibility ?? 50
  const lineWariness = clamp01((lineVisibility / 100) * (b.sensitivity.line / 100) * 1.4)
  const lineScore = 1 - lineWariness

  return clamp01(hookFit * 0.55 + lineScore * 0.45)
}

// ── Stage 5: caution — the tug-of-war between wariness and curiosity. ──
function scoreCautionMultiplier(species: FishSpecies, ctx: BiteContext, weightEstimate: number): number {
  const b = species.behavior
  const sizeRatio = weightEstimate / Math.max(0.01, species.averageWeight)
  const scaledCaution = clamp01((b.caution / 100) * Math.max(1, sizeRatio) ** (Math.log2(b.trophyCautionMultiplier || 1) || 0.3))
  const noisePenalty = clamp01((ctx.fishingPressure / 100) * (b.sensitivity.noise / 100))
  const wariness = clamp01(scaledCaution + noisePenalty * 0.6)
  const curiosityRelief = (b.curiosity / 100) * 0.4
  return clamp01(1 - wariness + curiosityRelief * wariness)
}

export function scoreSpecies(species: FishSpecies, ctx: BiteContext): BiteScoreBreakdown {
  const presence = scorePresence(species, ctx)
  if (presence <= 0) return { presence: 0, activity: 0, attraction: 0, presentation: 0, caution: 0, total: 0 }
  const activity = scoreActivity(species, ctx)
  const attraction = scoreAttraction(species, ctx)
  const presentation = scorePresentation(species, ctx)
  const caution = scoreCautionMultiplier(species, ctx, species.averageWeight)
  const total = clamp01(presence * activity * attraction * presentation * caution) * RARITY_WEIGHT[species.rarity]
  return { presence, activity, attraction, presentation, caution, total }
}

export function rankCandidates(ctx: BiteContext): SpeciesScore[] {
  return ctx.species
    .map((species) => ({ species, breakdown: scoreSpecies(species, ctx), score: 0 }))
    .map((s) => ({ ...s, score: s.breakdown.total }))
    .filter((s) => s.score > 0.015)
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
function getBiteTiming(biteStyle: FishSpecies['biteStyle'], aggressiveness: number): BiteTiming {
  const base = ((): BiteTiming => {
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
  })()
  // More aggressive fish commit faster and give a snappier (shorter) window.
  const aggFactor = 0.7 + (aggressiveness / 100) * 0.6
  return {
    nibbleWindowMs: base.nibbleWindowMs / aggFactor,
    strikeWindowMs: base.strikeWindowMs / Math.sqrt(aggFactor),
    commitProbMultiplier: base.commitProbMultiplier * aggFactor,
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
      const activity = ctx.spotActivityMultiplier
      const totalAttraction = candidates.reduce((s, c) => s + c.score, 0)
      const baseTickProb = clamp01(totalAttraction * 0.03 * activity)
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

      const breakdown = scoreSpecies(species, ctx)
      const progressProb = clamp01(0.16 * (0.3 + breakdown.attraction * 0.7))
      const spookProb = clamp01(0.16 * (1 - breakdown.caution))

      if (timerMs > 12000) return { nextStage: 'none', candidateSpeciesId: null, event: 'spooked' }
      if (rng() < spookProb) return { nextStage: 'none', candidateSpeciesId: null, event: 'spooked' }
      if (rng() < progressProb) return { nextStage: 'nibble', candidateSpeciesId, event: 'nibbling' }
      return { nextStage: 'interested', candidateSpeciesId }
    }

    case 'nibble': {
      if (!candidateSpeciesId) return { nextStage: 'none', candidateSpeciesId: null }
      const species = ctx.species.find((s) => s.id === candidateSpeciesId)
      if (!species) return { nextStage: 'none', candidateSpeciesId: null }

      const timing = getBiteTiming(species.biteStyle, species.behavior.aggressiveness)
      const fit = hookFitScore(species, ctx.loadout)
      const commitProb = clamp01(0.22 * timing.commitProbMultiplier * (0.4 + fit * 0.6))
      const dropProb = clamp01(0.05 * (1 - fit) + (timerMs / timing.nibbleWindowMs) * 0.03)

      if (timerMs > timing.nibbleWindowMs) return { nextStage: 'none', candidateSpeciesId: null }
      if (rng() < dropProb) return { nextStage: 'none', candidateSpeciesId: null }
      if (rng() < commitProb) return { nextStage: 'strong-bite', candidateSpeciesId, event: 'strong-bite' }
      return { nextStage: 'nibble', candidateSpeciesId }
    }

    case 'strong-bite': {
      if (!candidateSpeciesId) return { nextStage: 'none', candidateSpeciesId: null }
      const species = ctx.species.find((s) => s.id === candidateSpeciesId)
      const timing = getBiteTiming(species?.biteStyle ?? 'float-twitch', species?.behavior.aggressiveness ?? 40)
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

export function advanceGroundbaitSettle(zone: GroundbaitZone, species: FishSpecies[], gameMinutesElapsed: number): GroundbaitZone {
  const settleProgress = { ...zone.settleProgress }
  for (const s of species) {
    settleProgress[s.id] = tickSettleProgress(zone, s.id, s.behavior.groundbaitApproachSpeed, gameMinutesElapsed)
  }
  return { ...zone, settleProgress }
}

export { STAGE_TICK_MS }

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}
function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
