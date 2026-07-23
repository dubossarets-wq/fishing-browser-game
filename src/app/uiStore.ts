import { create } from 'zustand'
import { soundManager } from '@/engine/audio/soundManager'

export type ModalKind = 'none' | 'setup' | 'base' | 'help' | 'menu' | 'inventory' | 'auth' | 'settings' | 'admin'

const VOLUME_KEY = 'fishing-sim.volume'
const MUTED_KEY = 'fishing-sim.muted'

function loadStoredVolume(): number {
  const raw = localStorage.getItem(VOLUME_KEY)
  const parsed = raw !== null ? Number(raw) : NaN
  return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 60
}

function loadStoredMuted(): boolean {
  return localStorage.getItem(MUTED_KEY) === '1'
}

interface UiState {
  modal: ModalKind
  setupRodIndex: 0 | 1 | 2
  baseTab: 'livewell' | 'shop' | 'quests' | 'locations'
  socialTab: 'chat' | 'players' | 'events' | 'leaderboard'
  muted: boolean
  volume: number // 0-100
  openSetup: (rodIndex: 0 | 1 | 2) => void
  openBase: (tab?: UiState['baseTab']) => void
  openModal: (modal: ModalKind) => void
  closeModal: () => void
  setBaseTab: (tab: UiState['baseTab']) => void
  setSocialTab: (tab: UiState['socialTab']) => void
  toggleMuted: () => void
  setVolume: (volume: number) => void
}

const initialVolume = loadStoredVolume()
const initialMuted = loadStoredMuted()
soundManager.setVolume(initialVolume / 100)
soundManager.setMuted(initialMuted)

export const useUiStore = create<UiState>((set) => ({
  modal: 'none',
  setupRodIndex: 0,
  baseTab: 'livewell',
  socialTab: 'chat',
  muted: initialMuted,
  volume: initialVolume,
  openSetup: (rodIndex) => set({ modal: 'setup', setupRodIndex: rodIndex }),
  openBase: (tab) => set({ modal: 'base', ...(tab ? { baseTab: tab } : {}) }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: 'none' }),
  setBaseTab: (tab) => set({ baseTab: tab }),
  setSocialTab: (tab) => set({ socialTab: tab }),
  toggleMuted: () =>
    set((s) => {
      const muted = !s.muted
      soundManager.setMuted(muted)
      localStorage.setItem(MUTED_KEY, muted ? '1' : '0')
      return { muted }
    }),
  setVolume: (volume) => {
    const clamped = Math.min(100, Math.max(0, volume))
    soundManager.setVolume(clamped / 100)
    localStorage.setItem(VOLUME_KEY, String(clamped))
    set({ volume: clamped })
  },
}))
