import { useGameStore } from '@/app/store'
import { getRodBiteDebug } from '@/game/bite/debugState'

const ROW_LABELS: { key: keyof import('@/game/bite/biteSystem').BiteScoreBreakdown; label: string }[] = [
  { key: 'presence', label: 'Присутствие' },
  { key: 'activity', label: 'Активность' },
  { key: 'attraction', label: 'Привлечение' },
  { key: 'presentation', label: 'Подача' },
  { key: 'caution', label: 'Осторожность' },
  { key: 'total', label: 'ИТОГО' },
]

function Bar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100))
  const color = pct > 66 ? 'bg-moss-500' : pct > 33 ? 'bg-brass-500' : 'bg-ember-500'
  return (
    <div className="w-16 h-1.5 bg-black/20 rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function DevOverlay() {
  const admin = useGameStore((s) => s.admin)
  const activeRodIndex = useGameStore((s) => s.activeRodIndex)
  const environment = useGameStore((s) => s.environment)
  const weather = useGameStore((s) => s.weather)

  if (!admin.isAdmin || !admin.showDebugOverlay) return null

  const scores = getRodBiteDebug(activeRodIndex).slice(0, 6)

  return (
    <div className="fixed top-16 right-2 z-30 w-64 bg-black/80 text-white rounded-sm p-2.5 text-[11px] font-mono pointer-events-none">
      <div className="opacity-60 mb-1.5">
        DEV · вода {environment.waterTemperature.toFixed(1)}°C · свет {(environment.lightLevel * 100).toFixed(0)}% ·
        {' '}{weather.kind} · теч. {environment.currentSpeed.toFixed(0)}
      </div>
      {scores.length === 0 && <div className="opacity-40 italic">удочка не в воде — нет кандидатов</div>}
      {scores.map((s) => (
        <div key={s.species.id} className="mb-2 pb-1.5 border-b border-white/10 last:border-0">
          <div className="font-semibold mb-0.5">{s.species.name} — {(s.score * 100).toFixed(0)}%</div>
          {ROW_LABELS.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-2 leading-tight">
              <span className="opacity-60">{r.label}</span>
              <Bar value={s.breakdown[r.key]} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
