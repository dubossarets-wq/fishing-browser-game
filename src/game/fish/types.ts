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

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export type FishFamily = 'cyprinidae' | 'percidae' | 'esocidae' | 'siluridae' | 'other'

// Coarse feeding-ecology bucket — drives how the fish reacts to groundbait,
// live prey concentration and presentation, independent of exact species.
export type FeedingType =
  | 'benthic-omnivore' // карась/лещ/линь — roots through bottom, strong groundbait response
  | 'pelagic-peaceful' // плотва/краснопёрка — mid-water, fast light feeder
  | 'ambush-predator' // щука — sits and waits, barely cares about groundbait
  | 'active-predator' // жерех/окунь — hunts by sight/movement
  | 'benthic-predator' // сом/судак — hugs bottom, hunts by smell/vibration at night

export type PredatorType = 'none' | 'ambush' | 'active' | 'opportunistic'
export type SchoolingBehavior = 'solitary' | 'small-group' | 'large-school'
export type CurrentPreference = 'still' | 'slow' | 'moderate' | 'fast' | 'any'
export type OxygenPreference = 'low' | 'medium' | 'high'
export type StructureType = 'snags' | 'grass' | 'rocks' | 'drop-off' | 'open-bottom' | 'channel'

export interface SensitivityProfile {
  sight: number // 0-100 — reacts to visible line/shadow/movement above water
  line: number // 0-100 — reacts specifically to line thickness/visibility
  noise: number // 0-100 — reacts to bank noise, heavy casts, splashing
  smell: number // 0-100 — how much scent/aroma matters for finding food at all
}

// The behavioural half of a species definition — everything that isn't raw
// biometrics (weight/price/etc, which stay on FishSpecies itself for backward
// compatibility with the older simpler systems).
export interface FishBehaviorProfile {
  family: FishFamily
  feedingType: FeedingType
  predatorType: PredatorType
  schoolingBehavior: SchoolingBehavior
  schoolSize: [number, number]
  territoriality: number // 0-100 — how strongly it holds one spot vs roams
  caution: number // 0-100 — base wariness before any size scaling
  aggressiveness: number // 0-100 — willingness to strike competitively/defensively
  curiosity: number // 0-100 — willingness to investigate something unfamiliar
  sensitivity: SensitivityProfile
  preferredStructures: StructureType[]
  preferredCurrent: CurrentPreference
  oxygenPreference: OxygenPreference
  temperatureOptimum: number
  temperatureMin: number
  temperatureMax: number
  pressureSensitivity: number // 0-100 — how much it reacts to pressure trend
  weatherSensitivity: number // 0-100
  lightSensitivity: number // 0-100 — higher = prefers low light, avoids glare
  seasonalActivity: Record<Season, number> // 0-1 multiplier per season
  spawningSeasons: Season[] // feeding drops sharply during these
  feedingIntensityByTime: Record<TimeOfDay, number> // 0-1, replaces a flat allow-list
  groundbaitAffinity: number // 0-100 — how strongly a groundbait zone pulls it in
  groundbaitApproachSpeed: number // 0-100 — how fast it closes the distance once interested
  indirectPreyResponse: number // 0-100 — predators only: reacts to baitfish concentration, not the groundbait itself
  trophyCautionMultiplier: number // extra caution per kg over the species average — big fish get warier
}

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
  behavior: FishBehaviorProfile
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
