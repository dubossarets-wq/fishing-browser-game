import type { BaitId } from '@/game/fish/types'

export type ItemCategory = 'rod' | 'reel' | 'line' | 'hook' | 'sinker' | 'float' | 'feeder' | 'bait' | 'groundbait' | 'food' | 'tool' | 'trophy'

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

export interface BaitItem {
  id: BaitId
  category: 'bait'
  name: string
  description: string
  freshness: number // 0-100
  attractiveness: number // 1-100
  stackSize: number
  price: number
}

export interface GroundbaitItem {
  id: string
  category: 'groundbait'
  name: string
  description: string
  attractiveness: number
  spreadRadius: number
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
  hook: HookItem | null
  sinker: SinkerItem | null
  float: FloatItem | null
  feeder: FeederItem | null
  bait: BaitId | null
}

export function createEmptyLoadout(): RodLoadout {
  return {
    rod: null,
    reel: null,
    line: null,
    hook: null,
    sinker: null,
    float: null,
    feeder: null,
    bait: null,
  }
}
