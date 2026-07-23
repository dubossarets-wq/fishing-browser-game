import type { BaitId, TimeOfDay } from '@/game/fish/types'

export type QuestObjectiveKind =
  | 'catch-species'
  | 'catch-weight'
  | 'catch-count'
  | 'catch-with-bait'
  | 'catch-at-time'
  | 'catch-at-depth'
  | 'catch-trophy'

export interface QuestObjective {
  kind: QuestObjectiveKind
  speciesId?: string
  minWeight?: number
  count?: number
  baitId?: BaitId
  timeOfDay?: TimeOfDay
  minDepth?: number
  maxDepth?: number
}

export interface QuestReward {
  money: number
  experience: number
  itemId?: string
  unlockLocationId?: string
}

export interface QuestDefinition {
  id: string
  title: string
  description: string
  objective: QuestObjective
  reward: QuestReward
  requiredLevel: number
  locationId?: string
}

export interface QuestProgress {
  questId: string
  current: number
  target: number
  completed: boolean
  claimedAt: number | null
}
