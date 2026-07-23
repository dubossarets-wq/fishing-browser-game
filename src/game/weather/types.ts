import type { WeatherKind } from '@/game/fish/types'

export interface WeatherState {
  kind: WeatherKind
  temperature: number // celsius
  pressure: number // hPa, ~990-1030 normal range
  pressureTrend: 'rising' | 'falling' | 'stable'
  windSpeed: number // m/s
  windDirection: number // degrees 0-360
}

export function generateNextWeather(prev: WeatherState, allowedKinds: WeatherKind[], rng: () => number): WeatherState {
  const kindChanged = rng() < 0.15
  const kind = kindChanged
    ? allowedKinds[Math.floor(rng() * allowedKinds.length)]
    : prev.kind

  const tempDrift = (rng() - 0.5) * 3
  const temperature = clamp(prev.temperature + tempDrift, -10, 35)

  const pressureDrift = (rng() - 0.5) * 6
  const pressure = clamp(prev.pressure + pressureDrift, 975, 1040)
  const pressureTrend = pressureDrift > 1 ? 'rising' : pressureDrift < -1 ? 'falling' : 'stable'

  const windSpeed = clamp(prev.windSpeed + (rng() - 0.5) * 2, 0, 18)
  const windDirection = (prev.windDirection + (rng() - 0.5) * 40 + 360) % 360

  return { kind, temperature, pressure, pressureTrend, windSpeed, windDirection }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export const DEFAULT_WEATHER: WeatherState = {
  kind: 'clear',
  temperature: 18,
  pressure: 1013,
  pressureTrend: 'stable',
  windSpeed: 3,
  windDirection: 90,
}
