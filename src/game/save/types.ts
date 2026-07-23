import type { InventoryState } from '@/game/inventory/types'
import type { EconomyState } from '@/game/economy/types'
import type { QuestProgress } from '@/game/quests/types'
import type { RodLoadout } from '@/game/equipment/types'
import type { GameClock } from '@/game/time/types'
import type { WeatherState } from '@/game/weather/types'
import type { CaughtFish } from '@/game/fish/types'
import type { AdminState } from '@/game/admin/types'

export const SAVE_VERSION = 1

export interface PlayerStats {
  totalFishCaught: number
  totalWeightKg: number
  biggestFish: { speciesId: string; weight: number } | null
  speciesRecords: Record<string, number> // speciesId -> best weight
  totalMoneyEarned: number
  favoriteLocationId: string | null
  favoriteBaitId: string | null
}

export interface PlayerState {
  name: string
  level: number
  experience: number
  experienceToNext: number
  energy: number // 0-100
  skills: {
    float: number
    feeder: number
    spin: number
    carp: number
  }
}

export interface SaveGameV1 {
  version: 1
  savedAt: number
  player: PlayerState
  economy: EconomyState
  inventory: InventoryState
  rodLoadouts: [RodLoadout, RodLoadout, RodLoadout]
  currentLocationId: string
  unlockedLocationIds: string[]
  questProgress: QuestProgress[]
  stats: PlayerStats
  clock: GameClock
  weather: WeatherState
  livewell: CaughtFish[]
  admin?: AdminState // optional — absent in saves created before the admin system existed
}

export type SaveGame = SaveGameV1

export function createDefaultStats(): PlayerStats {
  return {
    totalFishCaught: 0,
    totalWeightKg: 0,
    biggestFish: null,
    speciesRecords: {},
    totalMoneyEarned: 0,
    favoriteLocationId: null,
    favoriteBaitId: null,
  }
}

export function createDefaultPlayer(): PlayerState {
  return {
    name: 'Рыболов',
    level: 1,
    experience: 0,
    experienceToNext: 100,
    energy: 100,
    skills: { float: 1, feeder: 1, spin: 1, carp: 1 },
  }
}
