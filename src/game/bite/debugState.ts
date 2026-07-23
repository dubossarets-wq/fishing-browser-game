import type { SpeciesScore } from '@/game/bite/biteSystem'

// Debug-only side channel: the last computed candidate rankings per rod, for
// the admin dev overlay. Deliberately outside the zustand store so normal
// players pay zero extra render cost for it.
const rodBiteDebug = new Map<number, SpeciesScore[]>()

export function setRodBiteDebug(rodIndex: number, scores: SpeciesScore[]) {
  rodBiteDebug.set(rodIndex, scores)
}

export function getRodBiteDebug(rodIndex: number): SpeciesScore[] {
  return rodBiteDebug.get(rodIndex) ?? []
}
