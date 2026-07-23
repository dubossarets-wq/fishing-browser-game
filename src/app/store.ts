import { create } from 'zustand'
import type { RodSlot } from '@/game/fishing/types'
import { createRodSlot, canTransition, isLoadoutComplete } from '@/game/fishing/types'
import type { RodLoadout } from '@/game/equipment/types'
import { createEmptyLoadout } from '@/game/equipment/types'
import type { CaughtFish } from '@/game/fish/types'
import { getFishSpeciesById, FISH_SPECIES } from '@/data/fish/species'
import { tickBite, rollFishWeight, rankCandidates, advanceGroundbaitSettle, STAGE_TICK_MS, type BiteContext } from '@/game/bite/biteSystem'
import { setRodBiteDebug } from '@/game/bite/debugState'
import { tickFight, createFightVitals, type FightInput, type FightGear, type FightOutcome } from '@/game/fight/fightSystem'
import { sampleDepthAt, type LocationDefinition } from '@/game/locations/types'
import { LOCATIONS, getLocationById } from '@/data/locations/locations'
import { getRodById } from '@/data/items/rods'
import { REELS, LINES, HOOKS, SINKERS, FLOATS } from '@/data/items/tackle'
import { getBaitById, getGroundbaitMixById } from '@/data/items/baits'
import { computeEffectiveBait, computeBaitFreshness } from '@/game/bait/baitSystem'
import type { EnvironmentState } from '@/game/environment/types'
import { initEnvironment, getSeason, tickWaterTemperature, computeLightLevel, computeCurrentSpeed } from '@/game/environment/types'
import type { GroundbaitZone } from '@/game/groundbait/types'
import { feedZone, tickZones, findZoneNear } from '@/game/groundbait/types'
import type { AdminState } from '@/game/admin/types'
import { createDefaultAdminState, PermissionService, ADMIN_UNLOCK_CODE } from '@/game/admin/types'
import type { GameClock } from '@/game/time/types'
import { GAME_MINUTES_PER_REAL_SECOND, getTimeOfDay, getWeekday, formatClock } from '@/game/time/types'
import type { WeatherState } from '@/game/weather/types'
import { DEFAULT_WEATHER, generateNextWeather } from '@/game/weather/types'
import type { EconomyState, LedgerEntry } from '@/game/economy/types'
import { initMarket, computeSalePrice, applySale, tickMarketReversion } from '@/game/economy/types'
import type { InventoryState } from '@/game/inventory/types'
import { addToInventory, removeFromInventory, removeStackById, getQuantity } from '@/game/inventory/types'
import { getShopItemById } from '@/game/economy/shopCatalog'
import type { QuestProgress } from '@/game/quests/types'
import { initProgress, advanceProgress } from '@/game/quests/questSystem'
import { QUESTS, getQuestById } from '@/data/quests/quests'
import type { PlayerState, PlayerStats, SaveGame } from '@/game/save/types'
import { SAVE_VERSION, createDefaultPlayer, createDefaultStats } from '@/game/save/types'
import { saveGame as dbSaveGame, loadGame as dbLoadGame } from '@/engine/persistence/db'
import { soundManager } from '@/engine/audio/soundManager'

export interface EventLogEntry {
  id: string
  gameMinute: number
  text: string
  kind: 'info' | 'catch' | 'weather' | 'market' | 'quest' | 'warning'
}

export interface ChatMessage {
  id: string
  author: string
  text: string
  timestamp: number
}

export interface MockPlayer {
  name: string
  fishCount: number
}

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random()}`
}

function spotKey(locationId: string, distance: number): string {
  return `${locationId}:${Math.round(distance / 5) * 5}`
}

function starterLoadout(kind: 'float' | 'feeder' | 'spin'): RodLoadout {
  const loadout = createEmptyLoadout()
  if (kind === 'float') {
    loadout.rod = getRodById('rod_float_basic') ?? null
    loadout.reel = { ...REELS[0] }
    loadout.line = { ...LINES[0] }
    loadout.hook = { ...HOOKS[1] }
    loadout.sinker = { ...SINKERS[0] }
    loadout.float = { ...FLOATS[0] }
    loadout.bait = 'worm'
  } else if (kind === 'feeder') {
    loadout.rod = getRodById('rod_feeder_basic') ?? null
    loadout.reel = { ...REELS[1] }
    loadout.line = { ...LINES[1] }
    loadout.hook = { ...HOOKS[2] }
    loadout.sinker = { ...SINKERS[1] }
    loadout.bait = 'dough'
  } else {
    loadout.rod = getRodById('rod_spin_basic') ?? null
    loadout.reel = { ...REELS[1] }
    loadout.line = { ...LINES[2] }
    loadout.hook = { ...HOOKS[4] }
    loadout.bait = 'softLure'
  }
  return loadout
}

function defaultInventory(): InventoryState {
  let inv: InventoryState = { stacks: [] }
  inv = addToInventory(inv, 'worm', 'bait', 25)
  inv = addToInventory(inv, 'maggot', 'bait', 20)
  inv = addToInventory(inv, 'dough', 'bait', 15)
  inv = addToInventory(inv, 'softLure', 'bait', 6)
  inv = addToInventory(inv, 'groundbait_universal', 'groundbait', 3)
  inv = addToInventory(inv, 'food_sandwich', 'food', 3)
  return inv
}

interface GameState {
  initialized: boolean
  player: PlayerState
  stats: PlayerStats
  clock: GameClock
  weather: WeatherState
  environment: EnvironmentState
  currentLocationId: string
  unlockedLocationIds: string[]
  inventory: InventoryState
  economy: EconomyState
  rods: [RodSlot, RodSlot, RodSlot]
  activeRodIndex: 0 | 1 | 2
  livewell: CaughtFish[]
  fightInputs: Record<number, FightInput>
  questProgress: Record<string, QuestProgress>
  events: EventLogEntry[]
  chatMessages: ChatMessage[]
  onlinePlayers: MockPlayer[]
  groundbaitZones: GroundbaitZone[]
  spotPressure: Record<string, number> // recent casting pressure per spot bucket, 0-100
  admin: AdminState
  paused: boolean

  init: () => Promise<void>
  tick: (dtMs: number) => void
  saveNow: () => Promise<void>

  setActiveRod: (index: 0 | 1 | 2) => void
  equipToRod: (rodIndex: 0 | 1 | 2, slotKey: keyof RodLoadout, stackId: string | null) => void
  setBaitOnRod: (rodIndex: 0 | 1 | 2, baitId: string | null) => void
  setBaitSandwich: (rodIndex: 0 | 1 | 2, baitId: string | null) => void
  setCastParams: (rodIndex: 0 | 1 | 2, distance: number, angle: number) => void
  beginSetup: (rodIndex: 0 | 1 | 2) => void
  finishSetup: (rodIndex: 0 | 1 | 2) => void
  castRod: (rodIndex: 0 | 1 | 2) => void
  reelInEmpty: (rodIndex: 0 | 1 | 2) => void
  strike: (rodIndex: 0 | 1 | 2) => void
  setFightInput: (rodIndex: 0 | 1 | 2, input: Partial<FightInput>) => void
  keepFish: (rodIndex: 0 | 1 | 2) => void
  releaseFish: (rodIndex: 0 | 1 | 2) => void
  acknowledgeBroken: (rodIndex: 0 | 1 | 2) => void

  sellFish: (instanceId: string) => void
  sellAllFish: () => void
  buyItem: (itemId: string, quantity: number) => boolean
  useGroundbait: (rodIndex: 0 | 1 | 2, itemId: string) => void
  eatFood: (stackId: string) => void

  travelToLocation: (locationId: string) => void
  claimQuest: (questId: string) => void

  pushEvent: (text: string, kind: EventLogEntry['kind']) => void
  sendChatMessage: (text: string) => void

  unlockAdmin: (code: string) => boolean
  setAdminFlag: (flag: keyof Omit<AdminState, 'isAdmin'>, value: boolean) => void
  adminSetLevel: (level: number) => void
  adminAddMoney: (amount: number) => void
  adminSetWeather: (kind: WeatherState['kind']) => void
  adminSetTemperature: (temp: number) => void
  adminSetTime: (hour: number) => void
  adminForceBite: (rodIndex: 0 | 1 | 2, speciesId: string) => void
}

function pickInitialQuestProgress(): Record<string, QuestProgress> {
  const map: Record<string, QuestProgress> = {}
  for (const q of QUESTS) map[q.id] = initProgress(q)
  return map
}

const INITIAL_CLOCK: GameClock = { totalGameMinutes: 6 * 60 }

export const useGameStore = create<GameState>((set, get) => ({
  initialized: false,
  player: createDefaultPlayer(),
  stats: createDefaultStats(),
  clock: INITIAL_CLOCK,
  weather: DEFAULT_WEATHER,
  environment: initEnvironment(INITIAL_CLOCK.totalGameMinutes, DEFAULT_WEATHER.temperature),
  currentLocationId: LOCATIONS[0].id,
  unlockedLocationIds: [LOCATIONS[0].id],
  inventory: defaultInventory(),
  economy: { money: 3500, market: initMarket(FISH_SPECIES.map((f) => f.id)), ledger: [] },
  rods: [
    createRodSlot(0, starterLoadout('float')),
    createRodSlot(1, starterLoadout('feeder')),
    createRodSlot(2, starterLoadout('spin')),
  ],
  activeRodIndex: 0,
  livewell: [],
  fightInputs: {},
  questProgress: pickInitialQuestProgress(),
  events: [{ id: uid(), gameMinute: 6 * 60, text: 'Добро пожаловать на водоём. Настройте удочку и сделайте первый заброс.', kind: 'info' }],
  chatMessages: [
    { id: uid(), author: 'Slayer', text: 'Клюёт у коряжника, глубина метров 4', timestamp: Date.now() },
    { id: uid(), author: 'Marlin_74', text: 'Да не, там сегодня глухо', timestamp: Date.now() },
  ],
  onlinePlayers: [
    { name: 'Slayer', fishCount: 47 },
    { name: 'Marlin_74', fishCount: 132 },
    { name: 'Ondatra', fishCount: 8 },
  ],
  groundbaitZones: [],
  spotPressure: {},
  admin: createDefaultAdminState(),
  paused: false,

  init: async () => {
    const save = await dbLoadGame()
    if (save) {
      set({
        player: save.player,
        stats: save.stats,
        clock: save.clock,
        weather: save.weather,
        environment: initEnvironment(save.clock.totalGameMinutes, save.weather.temperature),
        currentLocationId: save.currentLocationId,
        unlockedLocationIds: save.unlockedLocationIds,
        inventory: save.inventory,
        economy: save.economy,
        rods: [
          createRodSlot(0, save.rodLoadouts[0]),
          createRodSlot(1, save.rodLoadouts[1]),
          createRodSlot(2, save.rodLoadouts[2]),
        ],
        livewell: save.livewell,
        questProgress: Object.fromEntries(save.questProgress.map((p) => [p.questId, p])),
        admin: save.admin ?? createDefaultAdminState(),
        groundbaitZones: [],
        spotPressure: {},
        initialized: true,
      })
    } else {
      set({ initialized: true })
    }
    const loc = getLocationById(get().currentLocationId)
    if (loc) soundManager.startAmbient(loc.ambientSound, get().weather.windSpeed, get().weather.kind === 'rain')
  },

  saveNow: async () => {
    const s = get()
    const save: SaveGame = {
      version: SAVE_VERSION,
      savedAt: Date.now(),
      player: s.player,
      economy: s.economy,
      inventory: s.inventory,
      rodLoadouts: [s.rods[0].loadout, s.rods[1].loadout, s.rods[2].loadout],
      currentLocationId: s.currentLocationId,
      unlockedLocationIds: s.unlockedLocationIds,
      questProgress: Object.values(s.questProgress),
      stats: s.stats,
      clock: s.clock,
      weather: s.weather,
      livewell: s.livewell,
      admin: s.admin,
    }
    await dbSaveGame(save)
  },

  tick: (dtMs) => {
    const state = get()
    if (state.paused || !state.initialized) return

    const gameMinutesDelta = (dtMs / 1000) * GAME_MINUTES_PER_REAL_SECOND
    const nextClock: GameClock = { totalGameMinutes: state.clock.totalGameMinutes + gameMinutesDelta }

    let nextWeather = state.weather
    const prevHour = Math.floor(state.clock.totalGameMinutes / 30)
    const nextHour = Math.floor(nextClock.totalGameMinutes / 30)
    if (nextHour !== prevHour) {
      const loc = getLocationById(state.currentLocationId)
      nextWeather = generateNextWeather(state.weather, loc?.weatherProfile ?? ['clear'], Math.random)
      if (nextWeather.kind !== state.weather.kind) {
        get().pushEvent(weatherChangeText(nextWeather.kind), 'weather')
        const loc2 = getLocationById(state.currentLocationId)
        if (loc2) soundManager.startAmbient(loc2.ambientSound, nextWeather.windSpeed, nextWeather.kind === 'rain')
      }
    }

    const nextMarket = tickMarketReversion(state.economy.market, gameMinutesDelta)

    const location = getLocationById(state.currentLocationId)
    const timeOfDay = getTimeOfDay(Math.floor(nextClock.totalGameMinutes / 60) % 24)

    const nextEnvironment: EnvironmentState = {
      season: getSeason(nextClock.totalGameMinutes),
      waterTemperature: tickWaterTemperature(state.environment.waterTemperature, nextWeather.temperature, gameMinutesDelta),
      lightLevel: computeLightLevel((nextClock.totalGameMinutes / 60) % 24, nextWeather.kind),
      currentSpeed: computeCurrentSpeed(location?.baseCurrentSpeed ?? 0, nextWeather.windSpeed, nextWeather.kind),
    }

    const settledZones = state.groundbaitZones.map((zone) => {
      const zoneLoc = getLocationById(zone.locationId)
      const zoneSpecies = zoneLoc ? FISH_SPECIES.filter((f) => zoneLoc.fishSpeciesIds.includes(f.id)) : []
      return advanceGroundbaitSettle(zone, zoneSpecies, gameMinutesDelta)
    })
    const groundbaitZones = tickZones(settledZones, gameMinutesDelta, nextEnvironment.currentSpeed, getGroundbaitMixById)

    const pressureDecay = 6 * (gameMinutesDelta / 60) // per game-hour
    const spotPressure: Record<string, number> = {}
    for (const [key, value] of Object.entries(state.spotPressure)) {
      const next = value - pressureDecay
      if (next > 0.5) spotPressure[key] = next
    }

    const rods = state.rods.map((rod) => tickRod(rod, dtMs, {
      location,
      timeOfDay,
      weather: nextWeather,
      environment: nextEnvironment,
      groundbaitZones,
      spotPressure,
      state,
    })) as [RodSlot, RodSlot, RodSlot]

    const energyDrain = (dtMs / 1000) * 0.02
    const player = { ...state.player, energy: Math.max(0, state.player.energy - energyDrain) }

    set({
      clock: nextClock,
      weather: nextWeather,
      environment: nextEnvironment,
      economy: { ...state.economy, market: nextMarket },
      groundbaitZones,
      spotPressure,
      rods,
      player,
    })
  },

  setActiveRod: (index) => set({ activeRodIndex: index }),

  equipToRod: (rodIndex, slotKey, stackId) => {
    const state = get()
    const rod = state.rods[rodIndex]
    if (rod.state !== 'idle' && rod.state !== 'setup' && rod.state !== 'ready') return

    let inventory = state.inventory
    const loadout = { ...rod.loadout }

    // Return currently equipped durable item to inventory first
    const current = loadout[slotKey]
    if (current && typeof current === 'object' && 'id' in current && 'category' in current) {
      const currentItem = current as { id: string; category: string }
      inventory = addToInventory(inventory, currentItem.id, currentItem.category, 1)
    }

    if (stackId) {
      const stack = inventory.stacks.find((s) => s.id === stackId)
      if (stack) {
        const item = getShopItemById(stack.itemId)
        if (item) {
          ;(loadout as unknown as Record<string, unknown>)[slotKey] = item
          inventory = removeStackById(inventory, stackId)
        }
      }
    } else {
      ;(loadout as unknown as Record<string, unknown>)[slotKey] = null
    }

    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    rods[rodIndex] = { ...rod, loadout, state: 'setup' }
    set({ inventory, rods })
  },

  setBaitOnRod: (rodIndex, baitId) => {
    const state = get()
    const rod = state.rods[rodIndex]
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    rods[rodIndex] = { ...rod, loadout: { ...rod.loadout, bait: baitId as RodLoadout['bait'] } }
    set({ rods })
  },

  setBaitSandwich: (rodIndex, baitId) => {
    const state = get()
    const rod = state.rods[rodIndex]
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    rods[rodIndex] = { ...rod, loadout: { ...rod.loadout, baitSandwich: baitId as RodLoadout['baitSandwich'] } }
    set({ rods })
  },

  setCastParams: (rodIndex, distance, angle) => {
    if (!Number.isFinite(distance) || !Number.isFinite(angle)) return
    const state = get()
    const rod = state.rods[rodIndex]
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    rods[rodIndex] = { ...rod, castDistance: distance, castAngle: angle }
    set({ rods })
  },

  beginSetup: (rodIndex) => {
    const state = get()
    const rod = state.rods[rodIndex]
    if (!canTransition(rod.state, 'setup') && rod.state !== 'setup') return
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    rods[rodIndex] = { ...rod, state: 'setup' }
    set({ rods })
  },

  finishSetup: (rodIndex) => {
    const state = get()
    const rod = state.rods[rodIndex]
    const complete = rod.loadout.rod && rod.loadout.reel && rod.loadout.line && rod.loadout.hook && rod.loadout.bait
    if (!complete) return
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    rods[rodIndex] = { ...rod, state: 'ready' }
    set({ rods })
  },

  castRod: (rodIndex) => {
    const state = get()
    const rod = state.rods[rodIndex]
    if (rod.state !== 'ready') return
    if (!rod.loadout.bait) return

    const bypassBaitCost = PermissionService.has(state.admin, 'debug.no-bait-cost')
    if (!bypassBaitCost) {
      const qty = getQuantity(state.inventory, rod.loadout.bait)
      if (qty <= 0) {
        get().pushEvent('Наживка закончилась — пополните запас в магазине.', 'warning')
        return
      }
    }
    const inventory = bypassBaitCost ? state.inventory : removeFromInventory(state.inventory, rod.loadout.bait, 1)
    const key = spotKey(state.currentLocationId, rod.castDistance)
    const spotPressure = { ...state.spotPressure, [key]: Math.min(100, (state.spotPressure[key] ?? 0) + 18) }

    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    rods[rodIndex] = { ...rod, state: 'waiting', biteStage: 'none', biteTimerMs: 0, waitTimeMs: 0, hookedFish: null, lastResultFish: null, brokenReason: null }
    soundManager.play('cast')
    set({ rods, inventory, spotPressure })
  },

  reelInEmpty: (rodIndex) => {
    const state = get()
    const rod = state.rods[rodIndex]
    if (rod.state === 'caught' || rod.state === 'broken') return
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    const nextState = isLoadoutComplete(rod.loadout) ? 'ready' : 'setup'
    rods[rodIndex] = { ...rod, state: nextState, biteStage: 'none', biteTimerMs: 0, fight: null, hookedFish: null }
    set({ rods })
  },

  strike: (rodIndex) => {
    const state = get()
    const rod = state.rods[rodIndex]
    if (rod.state !== 'waiting' || rod.biteStage !== 'strong-bite') return
    const candidateId = rodCandidateSpecies.get(rodIndex) ?? null
    if (!candidateId) return
    const species = getFishSpeciesById(candidateId)
    if (!species) return
    const { weight } = rollFishWeight(species, Math.random)

    if (PermissionService.has(state.admin, 'debug.instant-catch')) {
      const fish: CaughtFish = {
        instanceId: uid(), speciesId: species.id, weight,
        isTrophy: weight >= species.trophyWeight * 0.92, caughtAt: Date.now(),
        locationId: state.currentLocationId, baitId: rod.loadout.bait ?? 'worm', price: 0,
      }
      const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
      rods[rodIndex] = { ...rod, state: 'caught', biteStage: 'hooked', fight: null, hookedFish: null, lastResultFish: fish }
      soundManager.play('catch')
      set({ rods })
      return
    }

    const vitals = createFightVitals(species, weight)
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    rods[rodIndex] = { ...rod, state: 'fight', biteStage: 'hooked', fight: vitals, hookedFish: { speciesId: species.id, weight } }
    soundManager.play('reel-click')
    set({ rods, fightInputs: { ...state.fightInputs, [rodIndex]: { reeling: false, giveLine: false, drag: 40 } } })
  },

  setFightInput: (rodIndex, input) => {
    const state = get()
    const current = state.fightInputs[rodIndex] ?? { reeling: false, giveLine: false, drag: 40 }
    set({ fightInputs: { ...state.fightInputs, [rodIndex]: { ...current, ...input } } })
  },

  keepFish: (rodIndex) => {
    const state = get()
    const rod = state.rods[rodIndex]
    if (rod.state !== 'caught' || !rod.lastResultFish) return
    const fish = rod.lastResultFish
    const species = getFishSpeciesById(fish.speciesId)
    const stats = { ...state.stats }
    stats.totalFishCaught += 1
    stats.totalWeightKg = Math.round((stats.totalWeightKg + fish.weight) * 100) / 100
    if (!stats.biggestFish || fish.weight > stats.biggestFish.weight) {
      stats.biggestFish = { speciesId: fish.speciesId, weight: fish.weight }
    }
    const record = stats.speciesRecords[fish.speciesId] ?? 0
    if (fish.weight > record) stats.speciesRecords = { ...stats.speciesRecords, [fish.speciesId]: fish.weight }

    let questProgress = state.questProgress
    let leveledUp = false
    const loc = getLocationById(state.currentLocationId)
    const depth = loc ? sampleDepthAt(loc, state.rods[rodIndex].castDistance).depth : 0
    const timeOfDay = getTimeOfDay(Math.floor(state.clock.totalGameMinutes / 60) % 24)
    for (const quest of QUESTS) {
      const progress = questProgress[quest.id]
      if (!progress || progress.completed) continue
      const nextProgress = advanceProgress(quest, progress, fish, timeOfDay, depth)
      if (nextProgress !== progress) {
        questProgress = { ...questProgress, [quest.id]: nextProgress }
        if (nextProgress.completed) {
          get().pushEvent(`Задание выполнено: «${quest.title}». Заберите награду на базе.`, 'quest')
        }
      }
    }

    const xpGain = Math.round(10 + fish.weight * 8 * (species ? rarityXpFactor(species.rarity) : 1))
    let { experience, experienceToNext, level } = state.player
    experience += xpGain
    while (experience >= experienceToNext) {
      experience -= experienceToNext
      level += 1
      experienceToNext = Math.round(experienceToNext * 1.35)
      leveledUp = true
    }

    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    const nextState = isLoadoutComplete(rod.loadout) ? 'ready' : 'idle'
    rods[rodIndex] = { ...rod, state: nextState, biteStage: 'none', fight: null, hookedFish: null, lastResultFish: null }
    soundManager.play('catch')
    set({
      rods,
      livewell: [...state.livewell, fish],
      stats,
      questProgress,
      player: { ...state.player, experience, experienceToNext, level },
    })
    get().pushEvent(`Поймана рыба: ${species?.name ?? fish.speciesId}, ${fish.weight} кг${fish.isTrophy ? ' — ТРОФЕЙ!' : ''}`, 'catch')
    if (leveledUp) get().pushEvent(`Новый уровень: ${level}!`, 'info')
  },

  releaseFish: (rodIndex) => {
    const state = get()
    const rod = state.rods[rodIndex]
    if (rod.state !== 'caught') return
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    const nextState = isLoadoutComplete(rod.loadout) ? 'ready' : 'idle'
    rods[rodIndex] = { ...rod, state: nextState, biteStage: 'none', fight: null, hookedFish: null, lastResultFish: null }
    set({ rods })
  },

  acknowledgeBroken: (rodIndex) => {
    const state = get()
    const rod = state.rods[rodIndex]
    if (rod.state !== 'broken') return
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    // A snapped line/hook damages the tackle — this rod genuinely needs re-rigging.
    rods[rodIndex] = { ...rod, state: 'idle', biteStage: 'none', fight: null, hookedFish: null, brokenReason: null }
    set({ rods })
  },

  sellFish: (instanceId) => {
    const state = get()
    const fish = state.livewell.find((f) => f.instanceId === instanceId)
    if (!fish) return
    const species = getFishSpeciesById(fish.speciesId)
    if (!species) return
    const market = applySale(state.economy.market, fish.speciesId, fish.weight)
    const entry = market.entries[fish.speciesId]
    const price = computeSalePrice(species.basePrice, fish.weight, species.rarity, entry.demandMultiplier)
    const ledgerEntry: LedgerEntry = {
      id: uid(), timestamp: Date.now(), gameMinute: state.clock.totalGameMinutes,
      amount: price, reason: `Продажа: ${species.name} ${fish.weight}кг`, category: 'sale',
    }
    set({
      economy: { money: state.economy.money + price, market, ledger: [...state.economy.ledger, ledgerEntry] },
      livewell: state.livewell.filter((f) => f.instanceId !== instanceId),
      stats: { ...state.stats, totalMoneyEarned: state.stats.totalMoneyEarned + price },
    })
    soundManager.play('coin')
  },

  sellAllFish: () => {
    const state = get()
    for (const fish of [...state.livewell]) {
      get().sellFish(fish.instanceId)
    }
  },

  buyItem: (itemId, quantity) => {
    const state = get()
    const item = getShopItemById(itemId)
    if (!item) return false
    const unlimited = PermissionService.has(state.admin, 'economy.unlimited')
    const totalPrice = item.price * quantity
    if (!unlimited && state.economy.money < totalPrice) return false
    let inventory = state.inventory
    const isDurable = item.category === 'rod' || item.category === 'reel'
    if (isDurable) {
      for (let i = 0; i < quantity; i++) {
        inventory = addToInventory(inventory, itemId, item.category, 1)
      }
    } else {
      inventory = addToInventory(inventory, itemId, item.category, quantity)
    }
    const ledgerEntry: LedgerEntry = {
      id: uid(), timestamp: Date.now(), gameMinute: state.clock.totalGameMinutes,
      amount: -totalPrice, reason: `Покупка: ${item.name} x${quantity}`, category: 'purchase',
    }
    set({
      inventory,
      economy: { ...state.economy, money: unlimited ? state.economy.money : state.economy.money - totalPrice, ledger: [...state.economy.ledger, ledgerEntry] },
    })
    soundManager.play('coin')
    return true
  },

  useGroundbait: (rodIndex, itemId) => {
    const state = get()
    const stack = state.inventory.stacks.find((s) => s.itemId === itemId && s.category === 'groundbait')
    if (!stack) return
    const mix = getGroundbaitMixById(itemId)
    if (!mix) return
    const rod = state.rods[rodIndex]
    const inventory = removeFromInventory(state.inventory, itemId, 1)
    const groundbaitZones = feedZone(state.groundbaitZones, state.currentLocationId, rod.castDistance, rod.castAngle, mix, state.clock.totalGameMinutes)
    set({ inventory, groundbaitZones })
    get().pushEvent('Точка прикормлена — рыба будет постепенно подходить, не сразу.', 'info')
  },

  eatFood: (stackId) => {
    const state = get()
    const stack = state.inventory.stacks.find((s) => s.id === stackId)
    if (!stack) return
    const item = getShopItemById(stack.itemId)
    if (!item || item.category !== 'food') return
    const inventory = removeFromInventory(state.inventory, stack.itemId, 1)
    set({
      inventory,
      player: { ...state.player, energy: Math.min(100, state.player.energy + item.energyRestore) },
    })
  },

  travelToLocation: (locationId) => {
    const state = get()
    const loc = getLocationById(locationId)
    if (!loc) return
    const bypassUnlock = PermissionService.has(state.admin, 'unlock.all')
    if (!bypassUnlock && !state.unlockedLocationIds.includes(locationId) && loc.unlockLevel > state.player.level) {
      get().pushEvent(`Локация «${loc.name}» откроется на уровне ${loc.unlockLevel}.`, 'warning')
      return
    }
    const bypassCost = PermissionService.has(state.admin, 'debug.no-travel-cost') || PermissionService.has(state.admin, 'economy.unlimited')
    if (!bypassCost && state.economy.money < loc.travelCost) {
      get().pushEvent('Недостаточно денег на поездку.', 'warning')
      return
    }
    const unlockedLocationIds = state.unlockedLocationIds.includes(locationId)
      ? state.unlockedLocationIds
      : [...state.unlockedLocationIds, locationId]
    const ledgerEntry: LedgerEntry = {
      id: uid(), timestamp: Date.now(), gameMinute: state.clock.totalGameMinutes,
      amount: -loc.travelCost, reason: `Поездка: ${loc.name}`, category: 'travel',
    }
    set({
      currentLocationId: locationId,
      unlockedLocationIds,
      economy: bypassCost ? state.economy : { ...state.economy, money: state.economy.money - loc.travelCost, ledger: [...state.economy.ledger, ledgerEntry] },
      rods: [createRodSlot(0, state.rods[0].loadout), createRodSlot(1, state.rods[1].loadout), createRodSlot(2, state.rods[2].loadout)],
      groundbaitZones: [],
    })
    soundManager.startAmbient(loc.ambientSound, state.weather.windSpeed, state.weather.kind === 'rain')
    get().pushEvent(`Вы прибыли на локацию «${loc.name}».`, 'info')
  },

  claimQuest: (questId) => {
    const state = get()
    const quest = getQuestById(questId)
    const progress = state.questProgress[questId]
    if (!quest || !progress || !progress.completed || progress.claimedAt) return
    let inventory = state.inventory
    if (quest.reward.itemId) {
      const item = getShopItemById(quest.reward.itemId)
      if (item) inventory = addToInventory(inventory, item.id, item.category, 1)
    }
    const unlockedLocationIds = quest.reward.unlockLocationId && !state.unlockedLocationIds.includes(quest.reward.unlockLocationId)
      ? [...state.unlockedLocationIds, quest.reward.unlockLocationId]
      : state.unlockedLocationIds

    const ledgerEntry: LedgerEntry = {
      id: uid(), timestamp: Date.now(), gameMinute: state.clock.totalGameMinutes,
      amount: quest.reward.money, reason: `Награда за задание: ${quest.title}`, category: 'quest',
    }
    let { experience, experienceToNext, level } = state.player
    experience += quest.reward.experience
    while (experience >= experienceToNext) {
      experience -= experienceToNext
      level += 1
      experienceToNext = Math.round(experienceToNext * 1.35)
    }
    set({
      inventory,
      unlockedLocationIds,
      economy: { ...state.economy, money: state.economy.money + quest.reward.money, ledger: [...state.economy.ledger, ledgerEntry] },
      questProgress: { ...state.questProgress, [questId]: { ...progress, claimedAt: Date.now() } },
      player: { ...state.player, experience, experienceToNext, level },
    })
    soundManager.play('coin')
  },

  pushEvent: (text, kind) => {
    const state = get()
    const entry: EventLogEntry = { id: uid(), gameMinute: state.clock.totalGameMinutes, text, kind }
    set({ events: [...state.events.slice(-49), entry] })
  },

  sendChatMessage: (text) => {
    const state = get()
    const msg: ChatMessage = { id: uid(), author: state.player.name, text, timestamp: Date.now() }
    const reply = maybeMockReply()
    set({
      chatMessages: [...state.chatMessages.slice(-49), msg, ...(reply ? [reply] : [])],
    })
  },

  unlockAdmin: (code) => {
    if (code !== ADMIN_UNLOCK_CODE) return false
    const state = get()
    set({ admin: { ...state.admin, isAdmin: true } })
    get().pushEvent('Режим разработчика активирован.', 'info')
    return true
  },

  setAdminFlag: (flag, value) => {
    const state = get()
    if (!state.admin.isAdmin) return
    set({ admin: { ...state.admin, [flag]: value } })
  },

  adminSetLevel: (level) => {
    const state = get()
    if (!state.admin.isAdmin) return
    set({ player: { ...state.player, level: Math.max(1, Math.round(level)), experience: 0 } })
  },

  adminAddMoney: (amount) => {
    const state = get()
    if (!state.admin.isAdmin) return
    set({ economy: { ...state.economy, money: Math.max(0, state.economy.money + amount) } })
  },

  adminSetWeather: (kind) => {
    const state = get()
    if (!state.admin.isAdmin) return
    set({ weather: { ...state.weather, kind } })
  },

  adminSetTemperature: (temp) => {
    const state = get()
    if (!state.admin.isAdmin) return
    set({ weather: { ...state.weather, temperature: temp } })
  },

  adminSetTime: (hour) => {
    const state = get()
    if (!state.admin.isAdmin) return
    const day = Math.floor(state.clock.totalGameMinutes / (24 * 60))
    set({ clock: { totalGameMinutes: day * 24 * 60 + hour * 60 } })
  },

  adminForceBite: (rodIndex, speciesId) => {
    const state = get()
    if (!state.admin.isAdmin) return
    const rod = state.rods[rodIndex]
    if (rod.state !== 'waiting') return
    rodCandidateSpecies.set(rodIndex, speciesId)
    const rods = [...state.rods] as [RodSlot, RodSlot, RodSlot]
    rods[rodIndex] = { ...rod, biteStage: 'strong-bite', biteTimerMs: 0 }
    set({ rods })
  },
}))

const rodCandidateSpecies = new Map<number, string | null>()

function rarityXpFactor(rarity: string): number {
  switch (rarity) {
    case 'uncommon': return 1.3
    case 'rare': return 1.8
    case 'epic': return 2.6
    case 'legendary': return 4
    default: return 1
  }
}

function weatherChangeText(kind: WeatherState['kind']): string {
  switch (kind) {
    case 'rain': return 'Начался дождь.'
    case 'fog': return 'Опустился туман.'
    case 'cloudy': return 'Небо затянуло облаками.'
    default: return 'Погода прояснилась.'
  }
}

function maybeMockReply(): ChatMessage | null {
  if (Math.random() > 0.4) return null
  const lines = [
    'Клюёт слабо сегодня',
    'На силикон пробовал?',
    'У меня фрикцион подгорел, срочно нужна новая катушка',
    'Погода вроде норм для клёва',
    'Кто-нибудь видел трофейного карпа тут?',
  ]
  const authors = ['Slayer', 'Marlin_74', 'Ondatra']
  return { id: uid(), author: authors[Math.floor(Math.random() * authors.length)], text: lines[Math.floor(Math.random() * lines.length)], timestamp: Date.now() }
}

function nearestSpotActivity(location: LocationDefinition, distance: number, angle: number): number {
  let best = 1
  let bestDist = Infinity
  for (const spot of location.spots) {
    const d = Math.hypot(distance - spot.distance, (angle - spot.angle) * 20)
    if (d < bestDist) {
      bestDist = d
      best = spot.activityMultiplier
    }
  }
  return bestDist < 15 ? best : 1
}

interface TickCtx {
  location: LocationDefinition | undefined
  timeOfDay: ReturnType<typeof getTimeOfDay>
  weather: WeatherState
  environment: EnvironmentState
  groundbaitZones: GroundbaitZone[]
  spotPressure: Record<string, number>
  state: GameState
}

function tickRod(rod: RodSlot, dtMs: number, ctx: TickCtx): RodSlot {
  const { location, timeOfDay, weather, environment } = ctx
  if (!location) return rod

  if (rod.state === 'waiting') {
    if (rod.biteStage === 'none' || rod.biteStage === 'interested' || rod.biteStage === 'nibble' || rod.biteStage === 'strong-bite') {
      const depthPoint = sampleDepthAt(location, rod.castDistance)
      const species = FISH_SPECIES.filter((f) => location.fishSpeciesIds.includes(f.id))
      const zone = findZoneNear(ctx.groundbaitZones, location.id, rod.castDistance, rod.castAngle)
      const pressureKey = spotKey(location.id, rod.castDistance)
      const pressure = ctx.spotPressure[pressureKey] ?? 0

      const primaryBait = rod.loadout.bait ? getBaitById(rod.loadout.bait) : undefined
      const secondaryBait = rod.loadout.baitSandwich ? getBaitById(rod.loadout.baitSandwich) : undefined
      const effectiveBait = primaryBait ? computeEffectiveBait(primaryBait, secondaryBait ?? null) : null
      const gameMinutesInWater = (rod.waitTimeMs / 1000) * GAME_MINUTES_PER_REAL_SECOND
      const baitFreshness = primaryBait ? computeBaitFreshness(primaryBait, gameMinutesInWater) : 100

      const bctx: BiteContext = {
        species,
        depthPoint,
        timeOfDay,
        weather: weather.kind,
        waterTemperature: environment.waterTemperature,
        season: environment.season,
        pressureTrend: weather.pressureTrend,
        lightLevel: environment.lightLevel,
        currentSpeed: environment.currentSpeed,
        loadout: rod.loadout,
        effectiveBait,
        baitFreshness,
        spotActivityMultiplier: nearestSpotActivity(location, rod.castDistance, rod.castAngle),
        groundbaitZone: zone,
        mixLookup: getGroundbaitMixById,
        fishingPressure: pressure,
        rng: Math.random,
      }

      // BiteSystem probabilities are calibrated per STAGE_TICK_MS (~250ms) of
      // stage time, not per animation frame — only actually roll once that
      // much time has accumulated, or bites would fire ~60x too often.
      const nextTimerMsRaw = rod.biteTimerMs + dtMs
      const crossedRollBoundary = Math.floor(rod.biteTimerMs / STAGE_TICK_MS) !== Math.floor(nextTimerMsRaw / STAGE_TICK_MS)
      if (!crossedRollBoundary) {
        return { ...rod, biteTimerMs: nextTimerMsRaw, waitTimeMs: rod.waitTimeMs + dtMs }
      }

      if (ctx.state.admin.isAdmin && ctx.state.admin.showDebugOverlay && rod.slotIndex === ctx.state.activeRodIndex) {
        setRodBiteDebug(rod.slotIndex, rankCandidates(bctx).slice(0, 6))
      }

      const prevCandidate = rodCandidateSpecies.get(rod.slotIndex) ?? null
      const result = tickBite(rod.biteStage, nextTimerMsRaw, prevCandidate, bctx)
      rodCandidateSpecies.set(rod.slotIndex, result.candidateSpeciesId)

      if (result.event === 'strong-bite' && rod.biteStage !== 'strong-bite') {
        soundManager.play('bite-bell')
      }

      const stageChanged = result.nextStage !== rod.biteStage
      return {
        ...rod,
        biteStage: result.nextStage,
        biteTimerMs: stageChanged ? 0 : nextTimerMsRaw,
        waitTimeMs: rod.waitTimeMs + dtMs,
      }
    }
  }

  if (rod.state === 'fight' && rod.fight && rod.hookedFish) {
    const species = getFishSpeciesById(rod.hookedFish.speciesId)
    if (!species) return rod
    const gear = rod.loadout
    if (!gear.rod || !gear.reel || !gear.line || !gear.hook) return rod
    const input = ctx.state.fightInputs[rod.slotIndex] ?? { reeling: false, giveLine: false, drag: 40 }
    const fightGear: FightGear = { rod: gear.rod, reel: gear.reel, line: gear.line, hook: gear.hook }
    const result = tickFight(rod.fight, species, fightGear, input, dtMs, Math.random)

    if (result.outcome !== 'ongoing') {
      if (result.outcome !== 'caught' && PermissionService.has(ctx.state.admin, 'debug.god-mode')) {
        return { ...rod, fight: result.vitals } // god mode: shrug off the break and keep fighting
      }
      return resolveFightOutcome(rod, result.outcome, result.vitals)
    }
    return { ...rod, fight: result.vitals }
  }

  return rod
}

function resolveFightOutcome(rod: RodSlot, outcome: FightOutcome, vitals: RodSlot['fight']): RodSlot {
  if (outcome === 'caught' && rod.hookedFish) {
    const bait = rod.loadout.bait
    const fish: CaughtFish = {
      instanceId: uid(),
      speciesId: rod.hookedFish.speciesId,
      weight: rod.hookedFish.weight,
      isTrophy: false,
      caughtAt: Date.now(),
      locationId: '',
      baitId: bait ?? 'worm',
      price: 0,
    }
    const species = getFishSpeciesById(fish.speciesId)
    if (species) fish.isTrophy = fish.weight >= species.trophyWeight * 0.92
    return { ...rod, state: 'caught', fight: null, lastResultFish: fish }
  }
  soundManager.play('line-snap')
  const reason = outcome === 'line-broken' ? 'line' : outcome === 'hook-pulled' ? 'hook' : 'rod'
  return { ...rod, state: 'broken', fight: vitals, hookedFish: null, brokenReason: reason }
}

export function getBaitDisplayName(baitId: string | null): string {
  if (!baitId) return '—'
  return getBaitById(baitId)?.name ?? baitId
}

export function formatGameClock(clock: GameClock): string {
  return formatClock(clock)
}

export function gameWeekday(clock: GameClock): string {
  return getWeekday(clock)
}
