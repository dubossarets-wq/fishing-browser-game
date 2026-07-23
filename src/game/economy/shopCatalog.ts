import { RODS } from '@/data/items/rods'
import { REELS, LINES, HOOKS, SINKERS, FLOATS, FEEDERS } from '@/data/items/tackle'
import { BAITS, GROUNDBAITS, FOODS } from '@/data/items/baits'
import type { EquipmentItem } from '@/game/equipment/types'

export const SHOP_CATALOG: EquipmentItem[] = [
  ...RODS,
  ...REELS,
  ...LINES,
  ...HOOKS,
  ...SINKERS,
  ...FLOATS,
  ...FEEDERS,
  ...BAITS,
  ...GROUNDBAITS,
  ...FOODS,
]

export function getShopItemById(id: string): EquipmentItem | undefined {
  return SHOP_CATALOG.find((i) => i.id === id)
}
