import type { QuestDefinition } from '@/game/quests/types'

export const QUESTS: QuestDefinition[] = [
  {
    id: 'q_first_catch',
    title: 'Первый улов',
    description: 'Поймай любую рыбу, чтобы освоиться на воде.',
    objective: { kind: 'catch-count', count: 1 },
    reward: { money: 200, experience: 50 },
    requiredLevel: 1,
  },
  {
    id: 'q_crucian_five',
    title: 'Карасиная охота',
    description: 'Поймай 5 карасей — эта рыба хорошо клюёт у илистого дна.',
    objective: { kind: 'catch-species', speciesId: 'crucian', count: 5 },
    reward: { money: 350, experience: 90 },
    requiredLevel: 1,
  },
  {
    id: 'q_bream_weight',
    title: 'Достойный лещ',
    description: 'Поймай леща весом не менее 1.5 кг на илистом поливе.',
    objective: { kind: 'catch-weight', speciesId: 'bream', minWeight: 1.5, count: 1 },
    reward: { money: 500, experience: 120 },
    requiredLevel: 3,
  },
  {
    id: 'q_perch_spin',
    title: 'Окунь на джиг',
    description: 'Поймай 3 окуня на силиконовую приманку.',
    objective: { kind: 'catch-with-bait', speciesId: 'perch', baitId: 'softLure', count: 3 },
    reward: { money: 400, experience: 100 },
    requiredLevel: 2,
  },
  {
    id: 'q_pike_trophy',
    title: 'Зубастая хозяйка коряжника',
    description: 'Поймай щуку весом не менее 5 кг.',
    objective: { kind: 'catch-weight', speciesId: 'pike', minWeight: 5, count: 1 },
    reward: { money: 1200, experience: 300, itemId: 'rod_spin_basic' },
    requiredLevel: 5,
  },
  {
    id: 'q_night_catfish',
    title: 'Ночная охота на сома',
    description: 'Поймай сома ночью в тихой старице.',
    objective: { kind: 'catch-at-time', speciesId: 'catfish', timeOfDay: 'night', count: 1 },
    reward: { money: 2500, experience: 500, unlockLocationId: 'quiet_backwater' },
    requiredLevel: 10,
    locationId: 'quiet_backwater',
  },
  {
    id: 'q_deep_zander',
    title: 'Судак на глубине',
    description: 'Поймай судака на глубине не менее 5 метров.',
    objective: { kind: 'catch-at-depth', speciesId: 'zander', minDepth: 5, count: 1 },
    reward: { money: 900, experience: 220 },
    requiredLevel: 6,
    locationId: 'stone_reservoir',
  },
  {
    id: 'q_carp_trophy',
    title: 'Трофейный карп',
    description: 'Поймай карпа весом не менее 10 кг.',
    objective: { kind: 'catch-trophy', speciesId: 'carp', minWeight: 10, count: 1 },
    reward: { money: 3000, experience: 600 },
    requiredLevel: 12,
  },
]

export function getQuestById(id: string): QuestDefinition | undefined {
  return QUESTS.find((q) => q.id === id)
}
