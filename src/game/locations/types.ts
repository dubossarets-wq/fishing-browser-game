import type { BottomType, WeatherKind } from '@/game/fish/types'

export interface DepthPoint {
  distance: number // meters from shore, 0-100
  depth: number // meters
  bottom: BottomType
}

export interface SpotDefinition {
  id: string
  name: string
  distance: number
  angle: number // -1 (left) to 1 (right), for minimap positioning
  activityMultiplier: number // local fish activity, 0.5-1.5
}

// Real photo backdrop for a location, swapped by time of day instead of the
// procedurally-drawn sky/hills/water. Boundaries are game-clock hours (0-24,
// fractional); night wraps past midnight.
export interface PhotoScene {
  morning: string // [morningStart, middayStart)
  midday: string // [middayStart, eveningStart)
  evening: string // [eveningStart, nightStart)
  night: string // [nightStart, 24) and [0, morningStart)
  morningStart: number
  middayStart: number
  eveningStart: number
  nightStart: number
}

export interface LocationDefinition {
  id: string
  name: string
  description: string
  backgroundImage: string
  photoScene?: PhotoScene
  ambientSound: 'lake' | 'river' | 'pond'
  depthProfile: DepthPoint[]
  spots: SpotDefinition[]
  fishSpeciesIds: string[]
  weatherProfile: WeatherKind[]
  unlockLevel: number
  travelCost: number
  licensePerDay: number
  maxAnglers: number
  baseCurrentSpeed: number // 0-100, still lake vs flowing river
}

export function activePhotoSceneImage(scene: PhotoScene, hourFraction: number): string {
  const h = ((hourFraction % 24) + 24) % 24
  if (h >= scene.morningStart && h < scene.middayStart) return scene.morning
  if (h >= scene.middayStart && h < scene.eveningStart) return scene.midday
  if (h >= scene.eveningStart && h < scene.nightStart) return scene.evening
  return scene.night
}

export function sampleDepthAt(location: LocationDefinition, distance: number): DepthPoint {
  const profile = location.depthProfile
  if (distance <= profile[0].distance) return profile[0]
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i]
    const b = profile[i + 1]
    if (distance >= a.distance && distance <= b.distance) {
      const t = (distance - a.distance) / (b.distance - a.distance || 1)
      const depth = a.depth + (b.depth - a.depth) * t
      const bottom = t < 0.5 ? a.bottom : b.bottom
      return { distance, depth, bottom }
    }
  }
  return profile[profile.length - 1]
}
