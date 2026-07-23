import type { FishRarity } from '@/game/fish/types'

export interface MarketEntry {
  speciesId: string
  demandMultiplier: number // 0.5 - 1.8, drifts toward 1.0 over time
  recentSalesWeight: number // rolling kg sold, decays over time, drives demand down when saturated
}

export interface MarketState {
  entries: Record<string, MarketEntry>
}

export interface LedgerEntry {
  id: string
  timestamp: number // real Date.now()
  gameMinute: number
  amount: number // positive = income, negative = expense
  reason: string
  category: 'sale' | 'quest' | 'purchase' | 'repair' | 'license' | 'travel' | 'food' | 'other'
}

export interface EconomyState {
  money: number
  market: MarketState
  ledger: LedgerEntry[]
}

export const RARITY_PRICE_MULTIPLIER: Record<FishRarity, number> = {
  common: 1.0,
  uncommon: 1.3,
  rare: 1.9,
  epic: 2.8,
  legendary: 4.5,
}

const DEMAND_FLOOR = 0.55
const DEMAND_CEILING = 1.85
const DEMAND_REVERSION_PER_MIN = 0.004
const SATURATION_PER_KG = 0.03

export function initMarket(speciesIds: string[]): MarketState {
  const entries: Record<string, MarketEntry> = {}
  for (const id of speciesIds) {
    entries[id] = { speciesId: id, demandMultiplier: 1.0, recentSalesWeight: 0 }
  }
  return { entries }
}

export function getOrCreateEntry(market: MarketState, speciesId: string): MarketEntry {
  return market.entries[speciesId] ?? { speciesId, demandMultiplier: 1.0, recentSalesWeight: 0 }
}

export function computeSalePrice(basePrice: number, weight: number, rarity: FishRarity, demandMultiplier: number): number {
  const price = basePrice * weight * RARITY_PRICE_MULTIPLIER[rarity] * demandMultiplier
  return Math.max(1, Math.round(price))
}

export function applySale(market: MarketState, speciesId: string, weight: number): MarketState {
  const entry = getOrCreateEntry(market, speciesId)
  const saturationDrop = weight * SATURATION_PER_KG
  const demandMultiplier = clamp(entry.demandMultiplier - saturationDrop, DEMAND_FLOOR, DEMAND_CEILING)
  const recentSalesWeight = entry.recentSalesWeight + weight
  return {
    entries: {
      ...market.entries,
      [speciesId]: { speciesId, demandMultiplier, recentSalesWeight },
    },
  }
}

export function tickMarketReversion(market: MarketState, elapsedGameMinutes: number): MarketState {
  const entries: Record<string, MarketEntry> = {}
  for (const [id, entry] of Object.entries(market.entries)) {
    const reversion = DEMAND_REVERSION_PER_MIN * elapsedGameMinutes
    const towardOne = entry.demandMultiplier < 1 ? entry.demandMultiplier + reversion : entry.demandMultiplier - reversion
    const demandMultiplier = clamp(
      Math.abs(towardOne - 1) < reversion ? 1 : towardOne,
      DEMAND_FLOOR,
      DEMAND_CEILING,
    )
    const recentSalesWeight = Math.max(0, entry.recentSalesWeight - elapsedGameMinutes * 0.01)
    entries[id] = { speciesId: id, demandMultiplier, recentSalesWeight }
  }
  return { entries }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
