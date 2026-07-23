import type { RodItem } from '@/game/equipment/types'

export const RODS: RodItem[] = [
  {
    id: 'rod_float_basic', category: 'rod', kind: 'float',
    name: 'Поплавочное удилище "Ивняк"', description: 'Лёгкое удилище для начинающих, подходит для мирной рыбы у берега.',
    power: 20, castTest: 25, length: 4, durability: 100, maxDurability: 100, sensitivity: 40,
    price: 850,
  },
  {
    id: 'rod_float_advanced', category: 'rod', kind: 'float',
    name: 'Поплавочное удилище "Стремнина"', description: 'Углепластиковый бланк с высокой чувствительностью.',
    power: 35, castTest: 30, length: 5, durability: 100, maxDurability: 100, sensitivity: 65,
    price: 3200,
  },
  {
    id: 'rod_feeder_basic', category: 'rod', kind: 'feeder',
    name: 'Фидер "Полевой"', description: 'Универсальный фидер средней мощности.',
    power: 45, castTest: 90, length: 3.6, durability: 100, maxDurability: 100, sensitivity: 45,
    price: 2400,
  },
  {
    id: 'rod_spin_basic', category: 'rod', kind: 'spinning',
    name: 'Спиннинг "Егерь"', description: 'Быстрый строй для активной проводки приманок.',
    power: 50, castTest: 40, length: 2.4, durability: 100, maxDurability: 100, sensitivity: 55,
    price: 2800,
  },
  {
    id: 'rod_carp_basic', category: 'rod', kind: 'carp',
    name: 'Карповое удилище "Валун"', description: 'Мощное удилище для дальнего заброса тяжёлой оснастки.',
    power: 75, castTest: 150, length: 3.9, durability: 100, maxDurability: 100, sensitivity: 35,
    price: 5200,
  },
  {
    id: 'rod_bottom_heavy', category: 'rod', kind: 'bottom',
    name: 'Донка "Тайфун"', description: 'Тяжёлая донная снасть для сома и крупного карпа.',
    power: 90, castTest: 200, length: 3.3, durability: 100, maxDurability: 100, sensitivity: 30,
    price: 7800,
  },
]

export function getRodById(id: string): RodItem | undefined {
  return RODS.find((r) => r.id === id)
}
