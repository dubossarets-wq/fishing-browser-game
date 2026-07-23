import type { QuestDefinition, QuestObjective, QuestProgress } from '@/game/quests/types'
import type { CaughtFish } from '@/game/fish/types'
import type { TimeOfDay } from '@/game/fish/types'

export function initProgress(quest: QuestDefinition): QuestProgress {
  const target = quest.objective.count ?? 1
  return { questId: quest.id, current: 0, target, completed: false, claimedAt: null }
}

function objectiveMatches(objective: QuestObjective, fish: CaughtFish, timeOfDay: TimeOfDay, depth: number): boolean {
  switch (objective.kind) {
    case 'catch-count':
      return true
    case 'catch-species':
      return fish.speciesId === objective.speciesId
    case 'catch-weight':
      return fish.speciesId === objective.speciesId && fish.weight >= (objective.minWeight ?? 0)
    case 'catch-with-bait':
      return fish.speciesId === objective.speciesId && fish.baitId === objective.baitId
    case 'catch-at-time':
      return fish.speciesId === objective.speciesId && timeOfDay === objective.timeOfDay
    case 'catch-at-depth':
      return (
        fish.speciesId === objective.speciesId &&
        depth >= (objective.minDepth ?? 0) &&
        depth <= (objective.maxDepth ?? Infinity)
      )
    case 'catch-trophy':
      return fish.speciesId === objective.speciesId && fish.isTrophy && fish.weight >= (objective.minWeight ?? 0)
    default:
      return false
  }
}

export function advanceProgress(
  quest: QuestDefinition,
  progress: QuestProgress,
  fish: CaughtFish,
  timeOfDay: TimeOfDay,
  depth: number,
): QuestProgress {
  if (progress.completed) return progress
  if (!objectiveMatches(quest.objective, fish, timeOfDay, depth)) return progress
  const current = Math.min(progress.target, progress.current + 1)
  return { ...progress, current, completed: current >= progress.target }
}
