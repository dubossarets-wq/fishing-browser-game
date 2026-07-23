import type { TimeOfDay } from '@/game/fish/types'

// Game-minutes that pass per real second. A full 24h (1440 game-minute) day/night
// cycle should take 30 real minutes (1800 real seconds) => 1440/1800 = 0.8.
export const GAME_MINUTES_PER_REAL_SECOND = 0.8

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const

export interface GameClock {
  totalGameMinutes: number // absolute counter since game start
}

export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 18) return 'day'
  if (hour >= 18 && hour < 21) return 'dusk'
  return 'night'
}

export function getHourAndMinute(clock: GameClock): { hour: number; minute: number } {
  const minutesInDay = Math.floor(clock.totalGameMinutes) % (24 * 60)
  return { hour: Math.floor(minutesInDay / 60), minute: minutesInDay % 60 }
}

export function getWeekday(clock: GameClock): (typeof WEEKDAYS)[number] {
  const day = Math.floor(clock.totalGameMinutes / (24 * 60)) % 7
  return WEEKDAYS[day]
}

export function formatClock(clock: GameClock): string {
  const { hour, minute } = getHourAndMinute(clock)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}
