import type { BaitItem, GroundbaitItem, FoodItem } from '@/game/equipment/types'

export const BAITS: BaitItem[] = [
  { id: 'worm', category: 'bait', name: 'Червь', description: 'Универсальная насадка животного происхождения.', freshness: 100, attractiveness: 60, stackSize: 20, price: 8 },
  { id: 'maggot', category: 'bait', name: 'Опарыш', description: 'Мелкая живая насадка, любима мирной рыбой.', freshness: 100, attractiveness: 55, stackSize: 30, price: 6 },
  { id: 'bloodworm', category: 'bait', name: 'Мотыль', description: 'Эффективен в холодной воде.', freshness: 100, attractiveness: 65, stackSize: 25, price: 10 },
  { id: 'corn', category: 'bait', name: 'Кукуруза', description: 'Растительная насадка, любима карпом.', freshness: 100, attractiveness: 50, stackSize: 40, price: 5 },
  { id: 'bread', category: 'bait', name: 'Хлеб', description: 'Простая насадка для плотвы и краснопёрки.', freshness: 100, attractiveness: 40, stackSize: 15, price: 3 },
  { id: 'dough', category: 'bait', name: 'Тесто', description: 'Мягкая насадка для карася и леща.', freshness: 100, attractiveness: 45, stackSize: 15, price: 4 },
  { id: 'peas', category: 'bait', name: 'Горох', description: 'Питательная насадка для карпа.', freshness: 100, attractiveness: 48, stackSize: 30, price: 6 },
  { id: 'liveBait', category: 'bait', name: 'Живец', description: 'Мелкая рыбка для хищника.', freshness: 100, attractiveness: 75, stackSize: 10, price: 25 },
  { id: 'boilie', category: 'bait', name: 'Бойл', description: 'Плотный шарик для карпа и сома.', freshness: 100, attractiveness: 70, stackSize: 20, price: 15 },
  { id: 'pellet', category: 'bait', name: 'Пеллетс', description: 'Прессованный корм высокой питательности.', freshness: 100, attractiveness: 55, stackSize: 40, price: 7 },
  { id: 'wobbler', category: 'bait', name: 'Воблер', description: 'Приманка-имитация малька для спиннинга.', freshness: 100, attractiveness: 65, stackSize: 1, price: 320 },
  { id: 'spoon', category: 'bait', name: 'Блесна', description: 'Классическая колеблющаяся приманка.', freshness: 100, attractiveness: 60, stackSize: 1, price: 180 },
  { id: 'softLure', category: 'bait', name: 'Силиконовая приманка', description: 'Мягкая приманка для джиговой ловли.', freshness: 100, attractiveness: 58, stackSize: 5, price: 90 },
  { id: 'jig', category: 'bait', name: 'Джиг-головка', description: 'Огруженный крючок для проводки силикона.', freshness: 100, attractiveness: 50, stackSize: 5, price: 60 },
]

export const GROUNDBAITS: GroundbaitItem[] = [
  { id: 'groundbait_universal', category: 'groundbait', name: 'Прикормка универсальная', description: 'Подходит для большинства мирной рыбы.', attractiveness: 45, spreadRadius: 1.5, uses: 5, price: 120 },
  { id: 'groundbait_carp', category: 'groundbait', name: 'Прикормка карповая', description: 'Питательная смесь для карпа и леща.', attractiveness: 60, spreadRadius: 2, uses: 5, price: 220 },
]

export const FOODS: FoodItem[] = [
  { id: 'food_sandwich', category: 'food', name: 'Бутерброд', energyRestore: 25, price: 40 },
  { id: 'food_thermos', category: 'food', name: 'Чай из термоса', energyRestore: 15, price: 20 },
  { id: 'food_stew', category: 'food', name: 'Тушёнка с хлебом', energyRestore: 45, price: 90 },
]

export function getBaitById(id: string): BaitItem | undefined {
  return BAITS.find((b) => b.id === id)
}
