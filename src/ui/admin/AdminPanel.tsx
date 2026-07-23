import { useState } from 'react'
import { useGameStore } from '@/app/store'
import { useUiStore } from '@/app/uiStore'
import { FISH_SPECIES } from '@/data/fish/species'
import { Button, Panel } from '@/ui/common/Panel'
import { useBackdropClose } from '@/ui/common/useBackdropClose'
import type { WeatherKind } from '@/game/fish/types'

const WEATHER_OPTIONS: WeatherKind[] = ['clear', 'cloudy', 'rain', 'fog']
const WEATHER_LABELS: Record<WeatherKind, string> = { clear: 'Ясно', cloudy: 'Облачно', rain: 'Дождь', fog: 'Туман' }

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer select-none py-1">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-brass-500" />
    </label>
  )
}

export function AdminPanel() {
  const closeModal = useUiStore((s) => s.closeModal)
  const admin = useGameStore((s) => s.admin)
  const setAdminFlag = useGameStore((s) => s.setAdminFlag)
  const adminSetLevel = useGameStore((s) => s.adminSetLevel)
  const adminAddMoney = useGameStore((s) => s.adminAddMoney)
  const adminSetWeather = useGameStore((s) => s.adminSetWeather)
  const adminSetTemperature = useGameStore((s) => s.adminSetTemperature)
  const adminSetTime = useGameStore((s) => s.adminSetTime)
  const adminForceBite = useGameStore((s) => s.adminForceBite)
  const player = useGameStore((s) => s.player)
  const weather = useGameStore((s) => s.weather)
  const activeRodIndex = useGameStore((s) => s.activeRodIndex)
  const rods = useGameStore((s) => s.rods)

  const [levelInput, setLevelInput] = useState(String(player.level))
  const [tempInput, setTempInput] = useState(String(Math.round(weather.temperature)))
  const [forceSpecies, setForceSpecies] = useState(FISH_SPECIES[0].id)

  const backdrop = useBackdropClose(closeModal)

  if (!admin.isAdmin) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6" {...backdrop}>
      <Panel paper className="w-full max-w-2xl p-5 max-h-[85vh] overflow-y-auto">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Панель разработчика</h2>
            <button onClick={closeModal} className="text-lg opacity-60 hover:opacity-100">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Panel className="!bg-black/5 p-3">
              <div className="text-xs uppercase opacity-60 mb-2">Игрок</div>
              <div className="flex items-center gap-2 mb-2">
                <input value={levelInput} onChange={(e) => setLevelInput(e.target.value)} className="w-16 text-xs px-2 py-1 rounded-sm bg-white/60 border border-black/10" />
                <Button variant="ghost" onClick={() => adminSetLevel(Number(levelInput) || 1)}>Уровень</Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" onClick={() => adminAddMoney(1000)}>+1000 ₽</Button>
                <Button variant="ghost" onClick={() => adminAddMoney(100000)}>+100000 ₽</Button>
              </div>
              <div className="text-[11px] opacity-60 mt-2">Разблокировка локаций и безлимитные деньги в магазине уже активны для админа автоматически.</div>
            </Panel>

            <Panel className="!bg-black/5 p-3">
              <div className="text-xs uppercase opacity-60 mb-2">Мир</div>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {WEATHER_OPTIONS.map((w) => (
                  <button key={w} onClick={() => adminSetWeather(w)} className={`text-[11px] px-2 py-1 rounded-sm ${weather.kind === w ? 'bg-brass-500 text-wood-950 font-semibold' : 'bg-black/10 hover:bg-black/20'}`}>
                    {WEATHER_LABELS[w]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <input value={tempInput} onChange={(e) => setTempInput(e.target.value)} className="w-16 text-xs px-2 py-1 rounded-sm bg-white/60 border border-black/10" />
                <Button variant="ghost" onClick={() => adminSetTemperature(Number(tempInput) || 15)}>Температура °C</Button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[6, 12, 19, 23].map((h) => (
                  <button key={h} onClick={() => adminSetTime(h)} className="text-[11px] px-2 py-1 rounded-sm bg-black/10 hover:bg-black/20">{h}:00</button>
                ))}
              </div>
            </Panel>

            <Panel className="!bg-black/5 p-3 col-span-2">
              <div className="text-xs uppercase opacity-60 mb-2">Рыба — форсировать поклёвку на активной удочке</div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={forceSpecies} onChange={(e) => setForceSpecies(e.target.value)} className="text-xs px-2 py-1 rounded-sm bg-white/60 border border-black/10">
                  {FISH_SPECIES.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <Button
                  variant="ghost"
                  disabled={rods[activeRodIndex].state !== 'waiting'}
                  onClick={() => adminForceBite(activeRodIndex, forceSpecies)}
                >
                  Клюнуло! (удочка {activeRodIndex + 1})
                </Button>
                <span className="text-[11px] opacity-60">удочка должна быть заброшена (state: waiting)</span>
              </div>
            </Panel>

            <Panel className="!bg-black/5 p-3 col-span-2">
              <div className="text-xs uppercase opacity-60 mb-2">Debug</div>
              <div className="grid grid-cols-2 gap-x-4">
                <Toggle label="God Mode (леска/крючок не рвутся)" checked={admin.godMode} onChange={(v) => setAdminFlag('godMode', v)} />
                <Toggle label="Без расхода наживки" checked={admin.noBaitCost} onChange={(v) => setAdminFlag('noBaitCost', v)} />
                <Toggle label="Instant catch (без вываживания)" checked={admin.instantCatch} onChange={(v) => setAdminFlag('instantCatch', v)} />
                <Toggle label="Без стоимости поездок" checked={admin.noTravelCost} onChange={(v) => setAdminFlag('noTravelCost', v)} />
                <Toggle label="Оверлей BiteScore" checked={admin.showDebugOverlay} onChange={(v) => setAdminFlag('showDebugOverlay', v)} />
              </div>
            </Panel>
          </div>

          <Button className="mt-4 w-full" onClick={closeModal}>Закрыть</Button>
        </div>
      </Panel>
    </div>
  )
}
