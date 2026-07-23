import type { FishSpecies } from '@/game/fish/types'
import type { FightVitals } from '@/game/fishing/types'
import type { RodItem, ReelItem, LineItem, HookItem } from '@/game/equipment/types'

export interface FightGear {
  rod: RodItem
  reel: ReelItem
  line: LineItem
  hook: HookItem
}

export interface FightInput {
  reeling: boolean
  giveLine: boolean
  drag: number // 0-100, player-set frictional resistance
}

export type FightOutcome = 'ongoing' | 'caught' | 'line-broken' | 'hook-pulled' | 'rod-broken'

export interface FightTickResult {
  vitals: FightVitals
  outcome: FightOutcome
}

const LINE_OUT_START = 40

export function createFightVitals(species: FishSpecies, weight: number): FightVitals {
  const weightFactor = Math.max(0.4, Math.min(3, weight / species.averageWeight))
  return {
    fishStamina: 100,
    fishSpeciesId: species.id,
    fishWeight: weight,
    lineTension: 15,
    lineOut: LINE_OUT_START,
    maxLineOut: 100,
    drag: 40,
    strengthRemaining: species.strength * weightFactor,
    phase: 'run',
    elapsedMs: 0,
  }
}

function pickPhase(stamina: number, elapsedMs: number, rng: () => number): FightVitals['phase'] {
  if (stamina <= 12) return 'final'
  if (elapsedMs < 1200) return 'run'
  const roll = rng()
  if (stamina > 65) return roll < 0.55 ? 'run' : 'hold'
  if (stamina > 30) return roll < 0.4 ? 'run' : roll < 0.75 ? 'hold' : 'recover'
  return roll < 0.3 ? 'run' : 'recover'
}

export function tickFight(
  vitals: FightVitals,
  species: FishSpecies,
  gear: FightGear,
  input: FightInput,
  dtMs: number,
  rng: () => number,
): FightTickResult {
  const dtS = dtMs / 1000
  const drag = clamp(input.drag, 0, 100)

  const phase = pickPhase(vitals.fishStamina, vitals.elapsedMs, rng)

  const phasePullMultiplier: Record<FightVitals['phase'], number> = {
    run: 1.5,
    hold: 0.85,
    recover: 0.35,
    final: 1.9,
  }

  const speciesTemperament: Record<FishSpecies['fightStyle'], number> = {
    steady: 0.8,
    burst: 1.25,
    diver: 1.0,
    thrasher: 1.4,
    endurance: 1.1,
  }

  // Real fish don't pull evenly — a run can suddenly surge much harder,
  // which is exactly the moment that snaps an over-tightened line.
  const surge = (phase === 'run' || phase === 'final') && rng() < 0.14 ? 1.7 : 1

  const staminaFactor = 0.3 + (vitals.fishStamina / 100) * 0.7
  const fishPullForce =
    vitals.strengthRemaining *
    0.01 *
    phasePullMultiplier[phase] *
    speciesTemperament[species.fightStyle] *
    staminaFactor *
    surge

  const dragResistance = (drag / 100) * gear.reel.dragMax
  const rodCushion = gear.rod.power / 100

  let netForce = fishPullForce - dragResistance * (0.6 + rodCushion * 0.5)
  // Giving line is a real relief valve, not a token gesture — it should
  // meaningfully drop tension so it's worth doing during a hard run.
  if (input.giveLine) netForce -= dragResistance * 0.9 + 1.4

  const tensionTarget = clamp(50 + netForce * 14, 5, 100)
  const nextTension = vitals.lineTension + (tensionTarget - vitals.lineTension) * clamp(dtS * 3, 0, 1)

  const exhaustion = 1 - vitals.fishStamina / 100 // 0 = fresh, 1 = fully spent

  let lineOut = vitals.lineOut
  if (netForce > 0.5) {
    lineOut = clamp(lineOut + netForce * 6 * dtS, 0, vitals.maxLineOut)
  } else if (input.reeling && nextTension < 92) {
    // A tired fish stops kicking against the reel — line comes in much
    // faster once its stamina is mostly spent.
    const reelPower = (gear.reel.retrieveSpeed / 100) * (1 + rodCushion * 0.3) * (1 + exhaustion * 1.1)
    lineOut = clamp(lineOut - reelPower * 8 * dtS, 0, vitals.maxLineOut)
  }

  let staminaDelta =
    (input.reeling ? 3.2 : 0.6) * (0.4 + drag / 140) * dtS * 10 +
    (phase === 'final' ? 1.8 : 0) * dtS +
    (surge > 1 ? 2.2 * dtS : 0)

  // Slack line lets a resting fish recover a little stamina — lean on the
  // drag too hard throughout and it never gets the chance.
  if (phase === 'recover' && !input.reeling && drag < 35) {
    staminaDelta -= 6 * dtS
  }

  const fishStamina = clamp(vitals.fishStamina - staminaDelta, 0, 100)

  const breakChanceThisTick = nextTension > 85 ? ((nextTension - 85) / 15) * 0.9 * dtS : 0
  const lineBreaks = rng() < breakChanceThisTick * (100 / (gear.line.breakingStrength * 12 + 40))

  const hookMismatch = clamp(1 - gear.hook.strength / 100, 0, 1)
  const hookFailChance = nextTension > 80 ? ((nextTension - 80) / 20) * hookMismatch * 0.6 * dtS : 0
  const hookFails = rng() < hookFailChance

  const nextVitals: FightVitals = {
    ...vitals,
    lineTension: nextTension,
    lineOut,
    fishStamina,
    strengthRemaining: Math.max(0, vitals.strengthRemaining - (input.reeling ? Math.max(0, staminaDelta) * 0.3 : 0)),
    phase,
    elapsedMs: vitals.elapsedMs + dtMs,
  }

  if (lineBreaks) return { vitals: nextVitals, outcome: 'line-broken' }
  if (hookFails) return { vitals: nextVitals, outcome: 'hook-pulled' }
  if (nextTension >= 100) return { vitals: nextVitals, outcome: 'line-broken' }

  if (lineOut <= 0.5 && fishStamina <= 20) {
    return { vitals: nextVitals, outcome: 'caught' }
  }

  return { vitals: nextVitals, outcome: 'ongoing' }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
