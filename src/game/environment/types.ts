import type { Season, TimeOfDay, WeatherKind } from '@/game/fish/types'

export interface EnvironmentState {
  season: Season
  waterTemperature: number // lags behind air temperature — the number fish actually care about
  lightLevel: number // 0-1, from time of day + weather (distinct from the canvas's visual ambientLight)
  currentSpeed: number // 0-100, location baseline modified by weather
}

export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter']

// A full "year" cycles over this many game-days so players actually see seasons
// change within a play session instead of it being a purely cosmetic label.
const GAME_DAYS_PER_SEASON = 6

export function getSeason(totalGameMinutes: number): Season {
  const gameDay = Math.floor(totalGameMinutes / (24 * 60))
  const seasonIndex = Math.floor(gameDay / GAME_DAYS_PER_SEASON) % SEASON_ORDER.length
  return SEASON_ORDER[seasonIndex]
}

export function seasonAirTemperatureBias(season: Season): number {
  switch (season) {
    case 'spring': return 0
    case 'summer': return 7
    case 'autumn': return -4
    case 'winter': return -14
  }
}

const WATER_TEMP_LAG_PER_GAME_HOUR = 0.14 // higher = water follows air faster

export function tickWaterTemperature(currentWaterTemp: number, airTemperature: number, gameMinutesElapsed: number): number {
  const gameHours = gameMinutesElapsed / 60
  const pull = Math.min(1, WATER_TEMP_LAG_PER_GAME_HOUR * gameHours)
  return currentWaterTemp + (airTemperature - currentWaterTemp) * pull
}

export function computeLightLevel(hourFraction: number, weather: WeatherKind): number {
  // Bell curve peaking at solar noon (12:00), zero at night.
  const angle = ((hourFraction - 6) / 12) * Math.PI // 0 at 06:00, PI at 18:00
  const daylight = hourFraction > 5 && hourFraction < 20 ? Math.max(0, Math.sin(Math.max(0, Math.min(Math.PI, angle)))) : 0
  const weatherFactor = weather === 'rain' ? 0.55 : weather === 'fog' ? 0.65 : weather === 'cloudy' ? 0.8 : 1
  return Math.min(1, Math.max(0, daylight * weatherFactor))
}

export function computeCurrentSpeed(baseCurrentSpeed: number, windSpeed: number, weather: WeatherKind): number {
  const windBoost = Math.min(15, windSpeed * 0.6)
  const rainBoost = weather === 'rain' ? 8 : 0
  return Math.min(100, Math.max(0, baseCurrentSpeed + windBoost + rainBoost))
}

export function initEnvironment(totalGameMinutes: number, airTemperature: number): EnvironmentState {
  return {
    season: getSeason(totalGameMinutes),
    waterTemperature: airTemperature,
    lightLevel: 0.5,
    currentSpeed: 0,
  }
}

export { type TimeOfDay }
