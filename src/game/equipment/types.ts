import type { BaitId, FeedingType } from '@/game/fish/types'

export type ItemCategory = 'rod' | 'reel' | 'line' | 'leader' | 'hook' | 'sinker' | 'float' | 'feeder' | 'bait' | 'groundbait' | 'food' | 'tool' | 'trophy'

export type RodKind = 'float' | 'feeder' | 'spinning' | 'carp' | 'bottom'

export interface RodItem {
  id: string
  category: 'rod'
  kind: RodKind
  name: string
  description: string
  power: number // 1-100, resistance to breaking under load
  castTest: number // max casting weight, grams
  length: number // meters
  durability: number // 0-100 current condition
  maxDurability: number
  sensitivity: number // 1-100, affects bite detection
  price: number
}

export interface ReelItem {
  id: string
  category: 'reel'
  name: string
  description: string
  lineCapacity: number // meters
  dragMax: number // kg, max drag force
  gearRatio: number
  durability: number
  maxDurability: number
  retrieveSpeed: number // 1-100
  price: number
}

export interface LineItem {
  id: string
  category: 'line'
  name: string
  description: string
  diameter: number // mm
  breakingStrength: number // kg
  visibility: number // 1-100, lower is stealthier
  stretch: number // 1-100, higher absorbs shock better
  lengthOnSpool: number // meters
  price: number
}

export type LeaderMaterial = 'mono' | 'fluorocarbon' | 'braid' | 'wire'

export interface LeaderItem {
  id: string
  category: 'leader'
  material: LeaderMaterial
  name: string
  description: string
  visibility: number // 1-100, lower is stealthier — fluorocarbon beats mono here
  breakingStrength: number // kg
  biteThroughResistance: number // 0-100 — resistance to a toothy fish severing it; only wire is high
  length: number // cm
  price: number
}

export type HookType = 'single' | 'treble' | 'circle' | 'wide-gap'

export interface HookItem {
  id: string
  category: 'hook'
  name: string
  size: number // 1 (small) - 20 (huge), traditional inverse scale simplified as 1-20 ascending = bigger
  hookType: HookType
  strength: number
  price: number
}

export interface SinkerItem {
  id: string
  category: 'sinker'
  name: string
  weight: number // grams
  price: number
}

export interface FloatItem {
  id: string
  category: 'float'
  name: string
  buoyancy: number // grams it can support
  visibility: number
  price: number
}

export interface FeederItem {
  id: string
  category: 'feeder'
  name: string
  weight: number
  capacity: number
  price: number
}

export type BaitCategory = 'animal' | 'plant' | 'specialized'
export type BaitBuoyancy = 'sink' | 'neutral' | 'float' | 'pop-up'

export interface BaitItem {
  id: BaitId
  category: 'bait'
  baitCategory: BaitCategory
  name: string
  description: string
  freshness: number // 0-100, current state (decays once equipped/cast — see BaitSystem)
  freshnessDecayPerGameHour: number // how fast it degrades once in play
  attractiveness: number // 1-100, baseline pull independent of species match
  size: number // 0-100, small to large — filters which fish sizes take it
  smell: number // 0-100, scent strength — matters most to smell-sensitive species
  naturalness: number // 0-100 — live bait is ~100, boilies/pastes much lower
  buoyancy: BaitBuoyancy
  movement: number // 0-100 — live/active bait, drives predator interest; 0 for inert bait
  targetFeedingTypes: FeedingType[] // feeding-ecology groups this bait suits well
  temperatureRange: [number, number] // water temp band where this bait performs best
  stackSize: number
  price: number
}

export interface GroundbaitItem {
  id: string
  category: 'groundbait'
  name: string
  description: string
  particleSize: number // 0-100 — fine mixes pull fish in faster but fill them up slower
  nutrition: number // 0-100 — how filling; high-nutrition mixes satiate fish sooner
  aromaStrength: number // 0-100 — effective radius of the scent cloud
  cloudiness: number // 0-100 — visible attraction cloud, matters more in stained/moving water
  stickiness: number // 0-100 — how tightly it holds together before breaking down
  sinkingSpeed: number // 0-100
  breakdownRate: number // 0-100 — higher = the zone depletes faster
  speciesAffinity: Partial<Record<FeedingType, number>> // 0-100 multiplier per feeding-ecology group
  spreadRadius: number // metres, base effective radius of the zone it creates
  uses: number
  price: number
}

export interface FoodItem {
  id: string
  category: 'food'
  name: string
  energyRestore: number
  price: number
}

export type EquipmentItem =
  | RodItem
  | ReelItem
  | LineItem
  | LeaderItem
  | HookItem
  | SinkerItem
  | FloatItem
  | FeederItem
  | BaitItem
  | GroundbaitItem
  | FoodItem

export interface RodLoadout {
  rod: RodItem | null
  reel: ReelItem | null
  line: LineItem | null
  leader: LeaderItem | null
  hook: HookItem | null
  sinker: SinkerItem | null
  float: FloatItem | null
  feeder: FeederItem | null
  bait: BaitId | null
  baitSandwich: BaitId | null // optional second component, e.g. worm + maggot
}

export function createEmptyLoadout(): RodLoadout {
  return {
    rod: null,
    reel: null,
    line: null,
    leader: null,
    hook: null,
    sinker: null,
    float: null,
    feeder: null,
    bait: null,
    baitSandwich: null,
  }
}
