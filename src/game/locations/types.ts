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

export interface LocationDefinition {
  id: string
  name: string
  description: string
  backgroundImage: string
  ambientSound: 'lake' | 'river' | 'pond'
  depthProfile: DepthPoint[]
  spots: SpotDefinition[]
  fishSpeciesIds: string[]
  weatherProfile: WeatherKind[]
  unlockLevel: number
  travelCost: number
  licensePerDay: number
  maxAnglers: number
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
