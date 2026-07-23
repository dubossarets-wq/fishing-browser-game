export type FishRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type BottomType = 'sand' | 'silt' | 'rocks' | 'grass' | 'shell' | 'snags'

export type BaitId =
  | 'worm'
  | 'maggot'
  | 'bloodworm'
  | 'corn'
  | 'bread'
  | 'dough'
  | 'peas'
  | 'liveBait'
  | 'boilie'
  | 'pellet'
  | 'wobbler'
  | 'spoon'
  | 'softLure'
  | 'jig'

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night'

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'fog'

export type BiteStyle = 'float-twitch' | 'float-drag' | 'float-plunge' | 'feeder-tap' | 'spin-strike'

export type FightStyle = 'steady' | 'burst' | 'diver' | 'thrasher' | 'endurance'

export interface FishSpecies {
  id: string
  name: string
  description: string
  minWeight: number
  averageWeight: number
  maxWeight: number
  trophyWeight: number
  rarity: FishRarity
  preferredDepth: [number, number]
  preferredBottom: BottomType[]
  preferredBaits: BaitId[]
  preferredTime: TimeOfDay[]
  preferredWeather: WeatherKind[]
  preferredTemperature: [number, number]
  strength: number
  stamina: number
  biteStyle: BiteStyle
  fightStyle: FightStyle
  basePrice: number
}

export interface CaughtFish {
  instanceId: string
  speciesId: string
  weight: number
  isTrophy: boolean
  caughtAt: number
  locationId: string
  baitId: BaitId
  price: number
}
