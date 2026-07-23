import type { ReelItem, LineItem, HookItem, SinkerItem, FloatItem, FeederItem } from '@/game/equipment/types'

export const REELS: ReelItem[] = [
  { id: 'reel_basic', category: 'reel', name: 'Катушка "Эконом 2000"', description: 'Простая безынерционная катушка.', lineCapacity: 100, dragMax: 4, gearRatio: 4.8, durability: 100, maxDurability: 100, retrieveSpeed: 40, price: 900 },
  { id: 'reel_mid', category: 'reel', name: 'Катушка "Форт 3000"', description: 'Плавный ход, надёжный фрикцион.', lineCapacity: 150, dragMax: 7, gearRatio: 5.2, durability: 100, maxDurability: 100, retrieveSpeed: 55, price: 2600 },
  { id: 'reel_heavy', category: 'reel', name: 'Катушка "Атлант 6000"', description: 'Силовая катушка для трофейной рыбалки.', lineCapacity: 250, dragMax: 15, gearRatio: 4.5, durability: 100, maxDurability: 100, retrieveSpeed: 45, price: 6400 },
]

export const LINES: LineItem[] = [
  { id: 'line_020', category: 'line', name: 'Леска 0.20мм', description: 'Лёгкая леска для некрупной рыбы.', diameter: 0.2, breakingStrength: 3, visibility: 30, stretch: 60, lengthOnSpool: 100, price: 180 },
  { id: 'line_030', category: 'line', name: 'Леска 0.30мм', description: 'Универсальная леска среднего класса.', diameter: 0.3, breakingStrength: 7, visibility: 45, stretch: 50, lengthOnSpool: 150, price: 260 },
  { id: 'line_045', category: 'line', name: 'Плетёный шнур 0.45мм', description: 'Прочный плетёный шнур для хищника.', diameter: 0.45, breakingStrength: 18, visibility: 60, stretch: 15, lengthOnSpool: 150, price: 620 },
  { id: 'line_060', category: 'line', name: 'Шнур 0.60мм усиленный', description: 'Для сома и крупного карпа.', diameter: 0.6, breakingStrength: 32, visibility: 70, stretch: 10, lengthOnSpool: 200, price: 980 },
]

export const HOOKS: HookItem[] = [
  { id: 'hook_4', category: 'hook', name: 'Крючок №4', size: 4, hookType: 'single', strength: 20, price: 25 },
  { id: 'hook_8', category: 'hook', name: 'Крючок №8', size: 8, hookType: 'single', strength: 35, price: 30 },
  { id: 'hook_12', category: 'hook', name: 'Крючок №12', size: 12, hookType: 'wide-gap', strength: 55, price: 45 },
  { id: 'hook_16', category: 'hook', name: 'Крючок №16', size: 16, hookType: 'circle', strength: 70, price: 60 },
  { id: 'hook_treble8', category: 'hook', name: 'Тройник №8', size: 10, hookType: 'treble', strength: 65, price: 90 },
]

export const SINKERS: SinkerItem[] = [
  { id: 'sinker_5', category: 'sinker', name: 'Грузило 5г', weight: 5, price: 15 },
  { id: 'sinker_15', category: 'sinker', name: 'Грузило 15г', weight: 15, price: 25 },
  { id: 'sinker_40', category: 'sinker', name: 'Грузило 40г', weight: 40, price: 45 },
  { id: 'sinker_90', category: 'sinker', name: 'Грузило 90г', weight: 90, price: 80 },
]

export const FLOATS: FloatItem[] = [
  { id: 'float_light', category: 'float', name: 'Поплавок лёгкий', buoyancy: 4, visibility: 20, price: 60 },
  { id: 'float_mid', category: 'float', name: 'Поплавок средний', buoyancy: 10, visibility: 30, price: 90 },
  { id: 'float_heavy', category: 'float', name: 'Поплавок дальний', buoyancy: 20, visibility: 40, price: 130 },
]

export const FEEDERS: FeederItem[] = [
  { id: 'feeder_small', category: 'feeder', name: 'Кормушка малая', weight: 30, capacity: 40, price: 150 },
  { id: 'feeder_large', category: 'feeder', name: 'Кормушка большая', weight: 70, capacity: 90, price: 240 },
]
