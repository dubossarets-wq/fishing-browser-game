import type { WeatherKind } from '@/game/fish/types'

export interface SkyPalette {
  skyTop: string
  skyBottom: string
  waterTop: string
  waterBottom: string
  sunColor: string
  ambientLight: number // 0-1, multiplies overlay darkness
}

const NIGHT: SkyPalette = { skyTop: '#050914', skyBottom: '#131c33', waterTop: '#0c1729', waterBottom: '#060c18', sunColor: '#cfd8f5', ambientLight: 0.22 }
const DAWN: SkyPalette = { skyTop: '#2b3a5c', skyBottom: '#e8935f', waterTop: '#8a6a56', waterBottom: '#3c3c52', sunColor: '#ffcf8f', ambientLight: 0.55 }
const DAY: SkyPalette = { skyTop: '#5f9fd6', skyBottom: '#cfe8f2', waterTop: '#3f7fa0', waterBottom: '#1f4f66', sunColor: '#fff6d8', ambientLight: 1.0 }
const DUSK: SkyPalette = { skyTop: '#2a2452', skyBottom: '#c96b4a', waterTop: '#5a4664', waterBottom: '#2a2740', sunColor: '#ff8f5e', ambientLight: 0.5 }

// Anchor points across the 24h clock the palette is pinned to; everything
// between two neighbours is interpolated so day/night drifts smoothly
// instead of snapping between four fixed buckets.
const DAY_KEYFRAMES: { hour: number; palette: SkyPalette }[] = [
  { hour: 0, palette: NIGHT },
  { hour: 4.5, palette: NIGHT },
  { hour: 6.5, palette: DAWN },
  { hour: 8.5, palette: DAY },
  { hour: 17, palette: DAY },
  { hour: 19, palette: DUSK },
  { hour: 21, palette: NIGHT },
  { hour: 24, palette: NIGHT },
]

function lerpPalette(a: SkyPalette, b: SkyPalette, t: number): SkyPalette {
  return {
    skyTop: mix(a.skyTop, b.skyTop, t),
    skyBottom: mix(a.skyBottom, b.skyBottom, t),
    waterTop: mix(a.waterTop, b.waterTop, t),
    waterBottom: mix(a.waterBottom, b.waterBottom, t),
    sunColor: mix(a.sunColor, b.sunColor, t),
    ambientLight: a.ambientLight + (b.ambientLight - a.ambientLight) * t,
  }
}

function basePaletteForHour(hourFraction: number): SkyPalette {
  const h = ((hourFraction % 24) + 24) % 24
  for (let i = 0; i < DAY_KEYFRAMES.length - 1; i++) {
    const a = DAY_KEYFRAMES[i]
    const b = DAY_KEYFRAMES[i + 1]
    if (h >= a.hour && h <= b.hour) {
      const t = (h - a.hour) / (b.hour - a.hour || 1)
      return lerpPalette(a.palette, b.palette, t)
    }
  }
  return NIGHT
}

/** hourFraction: 0-24, including fractional minutes (e.g. 14.5 = 14:30). */
export function getSkyPalette(hourFraction: number, weather: WeatherKind): SkyPalette {
  const base = basePaletteForHour(hourFraction)
  if (weather === 'cloudy' || weather === 'fog') {
    return { ...base, ambientLight: base.ambientLight * 0.75 }
  }
  if (weather === 'rain') {
    return { ...base, ambientLight: base.ambientLight * 0.55, skyTop: mix(base.skyTop, '#333944', 0.5), skyBottom: mix(base.skyBottom, '#333944', 0.5) }
  }
  return base
}

export interface LocationPalette {
  hillFar: string
  hillNear: string
  treeline: string
  bankColor: string
  accentName: string
}

const LOCATION_PALETTES: Record<string, LocationPalette> = {
  clay_bend: { hillFar: '#a9583b', hillNear: '#8a4128', treeline: '#3c4a2c', bankColor: '#5b4230', accentName: 'clay' },
  stone_reservoir: { hillFar: '#6b7078', hillNear: '#565b62', treeline: '#414a3d', bankColor: '#4a4b47', accentName: 'stone' },
  quiet_backwater: { hillFar: '#4d5c40', hillNear: '#3a4832', treeline: '#26331f', bankColor: '#3f3626', accentName: 'marsh' },
}

export function getLocationPalette(locationId: string): LocationPalette {
  return LOCATION_PALETTES[locationId] ?? LOCATION_PALETTES.clay_bend
}

function mix(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r},${g},${bl})`
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const v = hex.replace('#', '')
  return { r: parseInt(v.slice(0, 2), 16), g: parseInt(v.slice(2, 4), 16), b: parseInt(v.slice(4, 6), 16) }
}
