import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { clsx } from 'clsx'

interface WeeklyData {
  week: string
  social: number
  behaviour: number
  sensory: number
  total: number
}

interface WeeklySummaryProps {
  data: WeeklyData[]
}

const DOMAIN_CONFIG = [
  { key: 'social' as const, label: 'Social Communication', colour: 'bg-primary-100 text-primary-700 border-primary-200' },
  { key: 'behaviour' as const, label: 'Behaviour & Play', colour: 'bg-sage-100 text-sage-700 border-sage-200' },
  { key: 'sensory' as const, label: 'Sensory Responses', colour: 'bg-warm-100 text-warm-500 border-warm-200' },
]

function getTrend(data: WeeklyData[], key: 'social' | 'behaviour' | 'sensory') {
  if (data.length < 2) return 'stable'
  const first = data[0][key]
  const last = data[data.length - 1][key]
  const diff = last - first
  if (diff > 1) return 'increasing'
  if (diff < -1) return 'decreasing'
  return 'stable'
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'increasing') return <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
  if (trend === 'decreasing') return <TrendingDown className="h-3.5 w-3.5 text-sage-500" />
  return <Minus className="h-3.5 w-3.5 text-slate-400" />
}

export function WeeklySummary({ data }: WeeklySummaryProps) {
  const latestWeek = data[data.length - 1]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {DOMAIN_CONFIG.map((domain) => {
          const trend = getTrend(data, domain.key)
          const value = latestWeek?.[domain.key] ?? 0
          return (
            <div key={domain.key} className={clsx('border rounded-xl p-3 text-center', domain.colour)}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5 leading-tight">{domain.label}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <TrendIcon trend={trend} />
                <span className="text-xs capitalize">{trend}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Week breakdown */}
      <div className="space-y-1">
        {data.map((week) => (
          <div key={week.week} className="flex items-center gap-3 py-1.5">
            <span className="text-xs text-slate-400 w-14 flex-shrink-0">{week.week}</span>
            <div className="flex-1 flex gap-1">
              {week.social > 0 && (
                <div
                  className="h-4 bg-primary-400 rounded-sm transition-all"
                  style={{ width: `${Math.min((week.social / 15) * 100, 100)}%`, minWidth: 4 }}
                  title={`Social: ${week.social}`}
                />
              )}
              {week.behaviour > 0 && (
                <div
                  className="h-4 bg-sage-400 rounded-sm transition-all"
                  style={{ width: `${Math.min((week.behaviour / 15) * 100, 100)}%`, minWidth: 4 }}
                  title={`Behaviour: ${week.behaviour}`}
                />
              )}
              {week.sensory > 0 && (
                <div
                  className="h-4 bg-warm-400 rounded-sm transition-all"
                  style={{ width: `${Math.min((week.sensory / 15) * 100, 100)}%`, minWidth: 4 }}
                  title={`Sensory: ${week.sensory}`}
                />
              )}
              {week.total === 0 && (
                <div className="h-4 w-full bg-calm-100 rounded-sm" />
              )}
            </div>
            <span className="text-xs text-slate-400 w-6 text-right flex-shrink-0">{week.total}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
