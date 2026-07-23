import type { BaitItem, GroundbaitItem, FoodItem } from '@/game/equipment/types'

export const BAITS: BaitItem[] = [
  { id: 'worm', category: 'bait', baitCategory: 'animal', name: 'Червь', description: 'Универсальная насадка животного происхождения.',
    freshness: 100, freshnessDecayPerGameHour: 1.5, attractiveness: 60, size: 40, smell: 55, naturalness: 90,
    buoyancy: 'sink', movement: 30, targetFeedingTypes: ['benthic-omnivore', 'benthic-predator'], temperatureRange: [5, 28],
    stackSize: 20, price: 8 },
  { id: 'maggot', category: 'bait', baitCategory: 'animal', name: 'Опарыш', description: 'Мелкая живая насадка, любима мирной рыбой.',
    freshness: 100, freshnessDecayPerGameHour: 2, attractiveness: 55, size: 15, smell: 35, naturalness: 85,
    buoyancy: 'sink', movement: 40, targetFeedingTypes: ['pelagic-peaceful', 'benthic-omnivore'], temperatureRange: [5, 25],
    stackSize: 30, price: 6 },
  { id: 'bloodworm', category: 'bait', baitCategory: 'animal', name: 'Мотыль', description: 'Эффективен в холодной воде.',
    freshness: 100, freshnessDecayPerGameHour: 3, attractiveness: 65, size: 10, smell: 45, naturalness: 90,
    buoyancy: 'sink', movement: 25, targetFeedingTypes: ['pelagic-peaceful', 'benthic-omnivore'], temperatureRange: [2, 18],
    stackSize: 25, price: 10 },
  { id: 'corn', category: 'bait', baitCategory: 'plant', name: 'Кукуруза', description: 'Растительная насадка, любима карпом.',
    freshness: 100, freshnessDecayPerGameHour: 0.3, attractiveness: 50, size: 30, smell: 20, naturalness: 40,
    buoyancy: 'neutral', movement: 0, targetFeedingTypes: ['benthic-omnivore'], temperatureRange: [15, 30],
    stackSize: 40, price: 5 },
  { id: 'bread', category: 'bait', baitCategory: 'plant', name: 'Хлеб', description: 'Простая насадка для плотвы и краснопёрки.',
    freshness: 100, freshnessDecayPerGameHour: 4, attractiveness: 40, size: 35, smell: 15, naturalness: 30,
    buoyancy: 'float', movement: 0, targetFeedingTypes: ['pelagic-peaceful'], temperatureRange: [10, 26],
    stackSize: 15, price: 3 },
  { id: 'dough', category: 'bait', baitCategory: 'plant', name: 'Тесто', description: 'Мягкая насадка для карася и леща.',
    freshness: 100, freshnessDecayPerGameHour: 1.5, attractiveness: 45, size: 30, smell: 25, naturalness: 35,
    buoyancy: 'sink', movement: 0, targetFeedingTypes: ['benthic-omnivore'], temperatureRange: [10, 28],
    stackSize: 15, price: 4 },
  { id: 'peas', category: 'bait', baitCategory: 'plant', name: 'Горох', description: 'Питательная насадка для карпа.',
    freshness: 100, freshnessDecayPerGameHour: 0.4, attractiveness: 48, size: 25, smell: 15, naturalness: 35,
    buoyancy: 'sink', movement: 0, targetFeedingTypes: ['benthic-omnivore'], temperatureRange: [15, 28],
    stackSize: 30, price: 6 },
  { id: 'liveBait', category: 'bait', baitCategory: 'animal', name: 'Живец', description: 'Мелкая рыбка для хищника — постепенно устаёт.',
    freshness: 100, freshnessDecayPerGameHour: 5, attractiveness: 75, size: 60, smell: 40, naturalness: 95,
    buoyancy: 'neutral', movement: 80, targetFeedingTypes: ['ambush-predator', 'active-predator', 'benthic-predator'], temperatureRange: [4, 24],
    stackSize: 10, price: 25 },
  { id: 'boilie', category: 'bait', baitCategory: 'specialized', name: 'Бойл', description: 'Плотный шарик для карпа и сома.',
    freshness: 100, freshnessDecayPerGameHour: 0.1, attractiveness: 70, size: 55, smell: 60, naturalness: 25,
    buoyancy: 'sink', movement: 0, targetFeedingTypes: ['benthic-omnivore'], temperatureRange: [14, 28],
    stackSize: 20, price: 15 },
  { id: 'pellet', category: 'bait', baitCategory: 'specialized', name: 'Пеллетс', description: 'Прессованный корм высокой питательности.',
    freshness: 100, freshnessDecayPerGameHour: 0.5, attractiveness: 55, size: 30, smell: 50, naturalness: 30,
    buoyancy: 'sink', movement: 0, targetFeedingTypes: ['benthic-omnivore'], temperatureRange: [12, 28],
    stackSize: 40, price: 7 },
  { id: 'wobbler', category: 'bait', baitCategory: 'specialized', name: 'Воблер', description: 'Приманка-имитация малька для спиннинга.',
    freshness: 100, freshnessDecayPerGameHour: 0, attractiveness: 65, size: 65, smell: 0, naturalness: 20,
    buoyancy: 'neutral', movement: 70, targetFeedingTypes: ['ambush-predator', 'active-predator'], temperatureRange: [2, 26],
    stackSize: 1, price: 320 },
  { id: 'spoon', category: 'bait', baitCategory: 'specialized', name: 'Блесна', description: 'Классическая колеблющаяся приманка.',
    freshness: 100, freshnessDecayPerGameHour: 0, attractiveness: 60, size: 50, smell: 0, naturalness: 10,
    buoyancy: 'sink', movement: 75, targetFeedingTypes: ['active-predator', 'ambush-predator'], temperatureRange: [2, 24],
    stackSize: 1, price: 180 },
  { id: 'softLure', category: 'bait', baitCategory: 'specialized', name: 'Силиконовая приманка', description: 'Мягкая приманка для джиговой ловли.',
    freshness: 100, freshnessDecayPerGameHour: 0, attractiveness: 58, size: 45, smell: 5, naturalness: 25,
    buoyancy: 'sink', movement: 60, targetFeedingTypes: ['active-predator', 'benthic-predator'], temperatureRange: [4, 26],
    stackSize: 5, price: 90 },
  { id: 'jig', category: 'bait', baitCategory: 'specialized', name: 'Джиг-головка', description: 'Огруженный крючок для проводки силикона.',
    freshness: 100, freshnessDecayPerGameHour: 0, attractiveness: 50, size: 20, smell: 0, naturalness: 10,
    buoyancy: 'sink', movement: 20, targetFeedingTypes: ['active-predator', 'benthic-predator'], temperatureRange: [2, 26],
    stackSize: 5, price: 60 },
]

export const GROUNDBAITS: GroundbaitItem[] = [
  { id: 'groundbait_universal', category: 'groundbait', name: 'Прикормка универсальная', description: 'Подходит для большинства мирной рыбы.',
    particleSize: 30, nutrition: 35, aromaStrength: 50, cloudiness: 60, stickiness: 40, sinkingSpeed: 45, breakdownRate: 55,
    speciesAffinity: { 'benthic-omnivore': 70, 'pelagic-peaceful': 60 },
    spreadRadius: 1.5, uses: 5, price: 120 },
  { id: 'groundbait_fine', category: 'groundbait', name: 'Прикормка мелкодисперсная', description: 'Быстро привлекает, но слабо насыщает — требует частого докорма.',
    particleSize: 15, nutrition: 20, aromaStrength: 40, cloudiness: 80, stickiness: 20, sinkingSpeed: 20, breakdownRate: 70,
    speciesAffinity: { 'pelagic-peaceful': 85, 'benthic-omnivore': 40 },
    spreadRadius: 1.2, uses: 8, price: 90 },
  { id: 'groundbait_carp', category: 'groundbait', name: 'Прикормка карповая', description: 'Питательная крупнофракционная смесь, долго держит стаю.',
    particleSize: 70, nutrition: 75, aromaStrength: 65, cloudiness: 35, stickiness: 75, sinkingSpeed: 70, breakdownRate: 25,
    speciesAffinity: { 'benthic-omnivore': 95 },
    spreadRadius: 2, uses: 5, price: 220 },
]

export const FOODS: FoodItem[] = [
  { id: 'food_sandwich', category: 'food', name: 'Бутерброд', energyRestore: 25, price: 40 },
  { id: 'food_thermos', category: 'food', name: 'Чай из термоса', energyRestore: 15, price: 20 },
  { id: 'food_stew', category: 'food', name: 'Тушёнка с хлебом', energyRestore: 45, price: 90 },
]

export function getBaitById(id: string): BaitItem | undefined {
  return BAITS.find((b) => b.id === id)
}

export function getGroundbaitMixById(id: string): GroundbaitItem | undefined {
  return GROUNDBAITS.find((g) => g.id === id)
}
