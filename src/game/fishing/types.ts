import type { RodLoadout } from '@/game/equipment/types'
import type { CaughtFish } from '@/game/fish/types'

export type RodState =
  | 'idle'
  | 'setup'
  | 'ready'
  | 'cast'
  | 'waiting'
  | 'bite'
  | 'hooked'
  | 'fight'
  | 'caught'
  | 'broken'

export const ROD_STATE_TRANSITIONS: Record<RodState, RodState[]> = {
  idle: ['setup'],
  setup: ['ready', 'idle'],
  ready: ['cast', 'setup'],
  cast: ['waiting'],
  waiting: ['bite', 'idle'],
  bite: ['hooked', 'waiting'],
  hooked: ['fight', 'waiting'],
  fight: ['caught', 'broken', 'waiting'],
  caught: ['idle'],
  broken: ['idle'],
}

export function canTransition(from: RodState, to: RodState): boolean {
  return ROD_STATE_TRANSITIONS[from]?.includes(to) ?? false
}

export type BiteStage = 'none' | 'interested' | 'nibble' | 'strong-bite' | 'hooked'

export interface FightVitals {
  fishStamina: number // 0-100, depletes as fish is fought
  fishSpeciesId: string
  fishWeight: number
  lineTension: number // 0-100, danger above ~85
  lineOut: number // meters of line currently out
  maxLineOut: number
  drag: number // 0-100, player-controlled
  strengthRemaining: number // fish's remaining strength budget
  phase: 'run' | 'hold' | 'recover' | 'final'
  elapsedMs: number
}

export interface RodSlot {
  slotIndex: 0 | 1 | 2
  state: RodState
  loadout: RodLoadout
  castDistance: number // meters
  castAngle: number // -1..1
  targetSpotId: string | null
  biteStage: BiteStage
  biteTimerMs: number
  waitTimeMs: number
  fight: FightVitals | null
  hookedFish: { speciesId: string; weight: number } | null
  lastResultFish: CaughtFish | null
  brokenReason: 'line' | 'hook' | 'rod' | null
}

export function isLoadoutComplete(loadout: RodLoadout): boolean {
  return Boolean(loadout.rod && loadout.reel && loadout.line && loadout.hook && loadout.bait)
}

export function createRodSlot(index: 0 | 1 | 2, loadout: RodLoadout): RodSlot {
  return {
    slotIndex: index,
    state: isLoadoutComplete(loadout) ? 'ready' : 'idle',
    loadout,
    castDistance: 20,
    castAngle: 0,
    targetSpotId: null,
    biteStage: 'none',
    biteTimerMs: 0,
    waitTimeMs: 0,
    fight: null,
    hookedFish: null,
    lastResultFish: null,
    brokenReason: null,
  }
}
