import { useMemo, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useGameStore, formatGameClock, gameWeekday } from '@/app/store'
import { useUiStore } from '@/app/uiStore'
import { getLocationById } from '@/data/locations/locations'
import { sampleDepthAt } from '@/game/locations/types'
import { getQuestById } from '@/data/quests/quests'
import { Button, Panel } from '@/ui/common/Panel'
import type { WeatherKind } from '@/game/fish/types'

const BOTTOM_LABELS: Record<string, string> = {
  sand: 'песок', silt: 'ил', rocks: 'камни', grass: 'трава', shell: 'ракушка', snags: 'коряги',
}

const WEATHER_ICONS: Record<WeatherKind, string> = { clear: '☀️', cloudy: '☁️', rain: '🌧️', fog: '🌫️' }
const WEATHER_LABELS: Record<WeatherKind, string> = { clear: 'Ясно', cloudy: 'Облачно', rain: 'Дождь', fog: 'Туман' }

function WeatherStatus() {
  const weather = useGameStore((s) => s.weather)
  const clock = useGameStore((s) => s.clock)

  return (
    <Panel paper className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{WEATHER_ICONS[weather.kind]}</span>
          <div>
            <div className="text-sm font-semibold">{WEATHER_LABELS[weather.kind]}</div>
            <div className="text-[11px] opacity-70">{Math.round(weather.temperature)}°C · ветер {weather.windSpeed.toFixed(1)} м/с</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono font-semibold">{formatGameClock(clock)}</div>
          <div className="text-[11px] opacity-70">{gameWeekday(clock)}</div>
        </div>
      </div>
    </Panel>
  )
}

function DepthChart({ locationId, activeDistance }: { locationId: string; activeDistance: number }) {
  const activeRodIndex = useGameStore((s) => s.activeRodIndex)
  const rodState = useGameStore((s) => s.rods[activeRodIndex].state)
  const rodAngle = useGameStore((s) => s.rods[activeRodIndex].castAngle)
  const setCastParams = useGameStore((s) => s.setCastParams)
  const svgRef = useRef<SVGSVGElement>(null)

  const loc = getLocationById(locationId)
  if (!loc) return null
  const W = 240
  const H = 90
  const maxDepth = Math.max(...loc.depthProfile.map((p) => p.depth)) * 1.15
  const maxDist = loc.depthProfile[loc.depthProfile.length - 1].distance

  const points = loc.depthProfile.map((p) => {
    const x = (p.distance / maxDist) * W
    const y = (p.depth / maxDepth) * H
    return `${x},${y}`
  }).join(' ')

  const markerX = (Math.min(activeDistance, maxDist) / maxDist) * W
  const currentPoint = sampleDepthAt(loc, activeDistance)
  const markerY = (currentPoint.depth / maxDepth) * H

  const aimable = rodState === 'idle' || rodState === 'setup' || rodState === 'ready'

  const updateFromPointer = (clientX: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const distance = Math.round(frac * maxDist * 100) / 100
    setCastParams(activeRodIndex, distance, rodAngle)
  }

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!aimable) return
    updateFromPointer(e.clientX)
  }
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!aimable || e.buttons !== 1) return
    updateFromPointer(e.clientX)
  }

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full h-20 bg-black/25 rounded-sm ${aimable ? 'cursor-ew-resize' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <polygon points={`0,0 ${points} ${W},0`} fill="rgba(79,143,166,0.25)" />
        <polyline points={points} fill="none" stroke="#7fb8cc" strokeWidth={1.5} />
        <line x1={markerX} y1={0} x2={markerX} y2={H} stroke="#e8443a" strokeWidth={1} strokeDasharray="3,2" />
        <circle cx={markerX} cy={markerY} r={3.5} fill="#e8443a" />
      </svg>
      <div className="flex justify-between text-[11px] text-paper-300 mt-1">
        <span>0 м</span>
        <span>{Math.round(maxDist)} м</span>
      </div>
      <div className="flex justify-between text-xs mt-1 text-paper-200">
        <span>Глубина: {currentPoint.depth.toFixed(1)} м</span>
        <span>Дно: {BOTTOM_LABELS[currentPoint.bottom]}</span>
      </div>
    </div>
  )
}

function MiniMap({ locationId, activeDistance, activeAngle }: { locationId: string; activeDistance: number; activeAngle: number }) {
  const loc = getLocationById(locationId)
  if (!loc) return null
  const maxDist = loc.depthProfile[loc.depthProfile.length - 1].distance
  const size = 220

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-36 bg-lake-600/30 rounded-sm">
      <rect x={0} y={size - 14} width={size} height={14} fill="#3f3626" />
      {loc.spots.map((spot) => {
        const r = (spot.distance / maxDist) * (size / 2 - 10)
        const x = size / 2 + spot.angle * r
        const y = size - 14 - r
        return (
          <g key={spot.id}>
            <circle cx={x} cy={y} r={4} fill="#c9a24b" opacity={0.8} />
          </g>
        )
      })}
      {(() => {
        const r = (Math.min(activeDistance, maxDist) / maxDist) * (size / 2 - 10)
        const x = size / 2 + activeAngle * r
        const y = size - 14 - r
        return <circle cx={x} cy={y} r={5} fill="#e8443a" stroke="#fff" strokeWidth={1} />
      })()}
      <circle cx={size / 2} cy={size - 14} r={3} fill="#f4ecd8" />
    </svg>
  )
}

export function RightPanel() {
  const currentLocationId = useGameStore((s) => s.currentLocationId)
  const activeRodIndex = useGameStore((s) => s.activeRodIndex)
  const rod = useGameStore((s) => s.rods[activeRodIndex])
  const questProgress = useGameStore((s) => s.questProgress)
  const openBase = useUiStore((s) => s.openBase)
  const loc = getLocationById(currentLocationId)

  const activeQuest = useMemo(() => {
    const entries = Object.values(questProgress).filter((p) => !p.completed)
    if (entries.length === 0) return null
    const first = entries[0]
    const def = getQuestById(first.questId)
    return def ? { def, progress: first } : null
  }, [questProgress])

  if (!loc) return null

  return (
    <div className="panel-wood flex flex-col gap-3 p-3 overflow-y-auto text-paper-100">
      <WeatherStatus />

      <div>
        <div className="text-xs uppercase tracking-wide text-paper-300 mb-1">Профиль глубины</div>
        <DepthChart locationId={currentLocationId} activeDistance={rod.castDistance} />
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-paper-300 mb-1">Карта</div>
        <MiniMap locationId={currentLocationId} activeDistance={rod.castDistance} activeAngle={rod.castAngle} />
      </div>

      <Panel paper className="p-3">
        <div className="font-semibold text-sm">{loc.name}</div>
        <div className="text-xs mt-1 leading-snug opacity-80">{loc.description}</div>
        <div className="text-[11px] mt-2 opacity-70">Путёвка: {loc.licensePerDay} ₽/день · Рыбаков на базе: {loc.maxAnglers}</div>
      </Panel>

      {activeQuest && (
        <Panel paper className="p-3">
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Текущее задание</div>
          <div className="font-semibold text-sm">{activeQuest.def.title}</div>
          <div className="text-xs mt-1 opacity-80">{activeQuest.def.description}</div>
          <div className="text-xs mt-2 font-mono">{activeQuest.progress.current} / {activeQuest.progress.target}</div>
        </Panel>
      )}

      <Button onClick={() => openBase('quests')}>На базу</Button>
    </div>
  )
}
