'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react'

interface ImpactReachModelProps {
  orgId?: string
}

/* ── number formatter ── */
function fmt(n: number, currency = false): string {
  if (currency) {
    if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `£${(n / 1_000).toFixed(1)}k`
    return `£${n.toFixed(2)}`
  }
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString('en-GB', { maximumFractionDigits: 0 })
}

/* ── DfE SEN 2024/25 age-to-population lookup ── */
const AGE_DATA: { age: number; population: number; segment: string }[] = [
  { age: 14, population: 13_800, segment: 'Secondary school (Yrs 9–11)' },
  { age: 15, population: 14_200, segment: 'Secondary school (Yrs 9–11)' },
  { age: 16, population: 13_500, segment: 'Sixth form / FE college' },
  { age: 17, population: 12_800, segment: 'Sixth form / FE college' },
  { age: 18, population: 9_200, segment: 'HE / supported employment / NEET' },
  { age: 19, population: 7_400, segment: 'HE / supported employment / NEET' },
  { age: 20, population: 5_800, segment: 'HE / supported employment / NEET' },
  { age: 21, population: 4_600, segment: 'HE / supported employment / NEET' },
]

interface PlatformStats {
  totalUsers: number
  cvsBuilt: number
  cvsComplete: number
  advisorReports: number
  advisorComplete: number
  trainingCompletions: number
  totalWorkshops: number
  totalDownloads: number
  totalSurveyResponses: number
}

export function ImpactReachModel({ orgId }: ImpactReachModelProps) {
  /* ── Platform stats state ── */
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = orgId ? '/api/admin/reports' : '/api/super-admin/reports'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch reports')
      const data = await res.json()

      let totalUsers = 0
      let trainingCompletions = 0

      if (orgId) {
        totalUsers = data.totalUsers ?? 0
        if (data.modules) {
          for (const m of data.modules) trainingCompletions += m.completions ?? 0
        }
      } else {
        if (data.report) {
          for (const org of data.report) {
            totalUsers += org.totalUsers ?? 0
            if (org.modules) {
              for (const m of org.modules) trainingCompletions += m.completions ?? 0
            }
          }
        }
      }

      const cv = data.cvStats ?? {}
      const adv = data.advisorStats ?? {}

      setStats({
        totalUsers,
        cvsBuilt: cv.total ?? 0,
        cvsComplete: cv.byStatus?.COMPLETE ?? 0,
        advisorReports: adv.total ?? 0,
        advisorComplete: adv.byStatus?.COMPLETE ?? 0,
        trainingCompletions,
        totalWorkshops: data.workshopCount ?? 0,
        totalDownloads: data.downloadCount ?? 0,
        totalSurveyResponses: data.surveyResponseCount ?? 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { fetchStats() }, [fetchStats])

  /* ── Reach model state ── */
  const [minAge, setMinAge] = useState(14)
  const [maxAge, setMaxAge] = useState(21)
  const [adoption, setAdoption] = useState(60)
  const [loginRate, setLoginRate] = useState(50)
  const [caRate, setCaRate] = useState(70)
  const [cvRate, setCvRate] = useState(60)

  /* ── Reach calculations ── */
  const cohorts = useMemo(() => {
    const inRange = AGE_DATA.filter(d => d.age >= minAge && d.age <= maxAge)
    const secondary = inRange.filter(d => d.segment.startsWith('Secondary')).reduce((s, d) => s + d.population, 0)
    const sixthForm = inRange.filter(d => d.segment.startsWith('Sixth')).reduce((s, d) => s + d.population, 0)
    const heNeet = inRange.filter(d => d.segment.startsWith('HE')).reduce((s, d) => s + d.population, 0)
    return { secondary, sixthForm, heNeet, total: secondary + sixthForm + heNeet }
  }, [minAge, maxAge])

  const projections = useMemo(() => {
    const totalPool = cohorts.total
    const inScopeUsers = totalPool * (adoption / 100)
    const activeUsers = inScopeUsers * (loginRate / 100)
    const caAnnual = activeUsers * (caRate / 100)
    const cvAnnual = activeUsers * (cvRate / 100)
    const trainingAnnual = activeUsers * 0.85
    const weeklyLogins = activeUsers / 38

    const caTokenCostUSD = caAnnual * (1000 * 0.15 / 1_000_000 + 1500 * 0.60 / 1_000_000)
    const cvTokenCostUSD = cvAnnual * 4 * (500 * 0.15 / 1_000_000 + 300 * 0.60 / 1_000_000)
    const monthlyGBP = ((caTokenCostUSD + cvTokenCostUSD) / 12) * 0.79

    return { inScopeUsers, activeUsers, caAnnual, cvAnnual, trainingAnnual, weeklyLogins, monthlyGBP }
  }, [cohorts.total, adoption, loginRate, caRate, cvRate])

  /* ── Slider track positions ── */
  const trackLeft = ((minAge - 14) / 7) * 100
  const trackWidth = ((maxAge - minAge) / 7) * 100

  return (
    <div className="space-y-6">
      {/* ── Section 1: Live Platform Stats ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Live Platform Stats</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="text-center py-6 text-red-500 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && !stats && (
          <div className="text-center py-10 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading stats...
          </div>
        )}

        {stats && (
          <div className="space-y-3">
            {/* Row 1 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Total users" value={fmt(stats.totalUsers)} />
              <StatCard label="CVs built" value={fmt(stats.cvsBuilt)} sub={`${stats.cvsComplete} complete`} />
              <StatCard label="Careers advisor reports" value={fmt(stats.advisorReports)} sub={`${stats.advisorComplete} complete`} />
              <StatCard label="Training completions" value={fmt(stats.trainingCompletions)} />
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total workshops" value={fmt(stats.totalWorkshops)} />
              <StatCard label="Total downloads" value={fmt(stats.totalDownloads)} />
              <StatCard label="Survey responses" value={fmt(stats.totalSurveyResponses)} />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: National Reach Model ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">
          National Reach Model — DfE SEN 2024/25
        </p>

        {/* Age range slider */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ages {minAge} – {maxAge}
          </p>

          {/* Dual-handle slider */}
          <div className="range-wrap relative h-9 mb-3">
            {/* Track background */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            {/* Filled track */}
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1 bg-teal-500 rounded-full"
              style={{ left: `${trackLeft}%`, width: `${trackWidth}%` }}
            />
            {/* Min handle */}
            <input
              type="range"
              min={14}
              max={21}
              value={minAge}
              onChange={e => {
                const v = Number(e.target.value)
                if (v <= maxAge) setMinAge(v)
              }}
              className="range-input absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-teal-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md"
              style={{ zIndex: minAge > 17 ? 5 : 3 }}
            />
            {/* Max handle */}
            <input
              type="range"
              min={14}
              max={21}
              value={maxAge}
              onChange={e => {
                const v = Number(e.target.value)
                if (v >= minAge) setMaxAge(v)
              }}
              className="range-input absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-teal-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md"
              style={{ zIndex: 4 }}
            />
          </div>

          {/* Cohort breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <span className="text-gray-400 dark:text-gray-500">Secondary school:</span>{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{cohorts.secondary.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Sixth form / FE:</span>{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{cohorts.sixthForm.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">HE / employment / NEET:</span>{' '}
              <span className="font-medium text-gray-700 dark:text-gray-300">{cohorts.heNeet.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500">Total selected pool:</span>{' '}
              <span className="font-semibold text-gray-900 dark:text-gray-100">{cohorts.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Assumption sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <AssumptionSlider
            label="School / provider adoption"
            value={adoption}
            onChange={setAdoption}
            min={5}
            max={100}
            step={5}
            suffix="%"
          />
          <AssumptionSlider
            label="% eligible who log in"
            value={loginRate}
            onChange={setLoginRate}
            min={10}
            max={90}
            step={5}
            suffix="%"
          />
          <AssumptionSlider
            label="% who do careers advisor"
            value={caRate}
            onChange={setCaRate}
            min={10}
            max={100}
            step={5}
            suffix="%"
          />
          <AssumptionSlider
            label="% who build a CV"
            value={cvRate}
            onChange={setCvRate}
            min={10}
            max={100}
            step={5}
            suffix="%"
          />
        </div>

        {/* Calculated outputs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
          <MetricCard label="In-scope users" value={fmt(Math.round(projections.inScopeUsers))} sub="at adoption rate" />
          <MetricCard label="Active users" value={fmt(Math.round(projections.activeUsers))} sub="who log in" />
          <MetricCard label="Weekly logins" value={fmt(Math.round(projections.weeklyLogins))} />
          <MetricCard label="Est. Gemini AI cost/mo" value={fmt(projections.monthlyGBP, true)} highlight="green" />
          <MetricCard label="Careers advisor / year" value={fmt(Math.round(projections.caAnnual))} highlight="green" />
          <MetricCard label="CVs built / year" value={fmt(Math.round(projections.cvAnnual))} />
          <MetricCard label="Training completions / yr" value={fmt(Math.round(projections.trainingAnnual))} />
        </div>

        {/* Impact statement */}
        <div className="rounded-lg px-4 py-3 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 text-sm mb-3">
          <strong>{fmt(Math.round(projections.caAnnual))}</strong> autistic young people receiving AI-powered careers guidance annually — equivalent to ~<strong>{fmt(Math.round(projections.caAnnual / 250))}</strong> full-time careers advisers in output.
        </div>

        {/* Warning bar */}
        {adoption >= 70 && (
          <div className="rounded-lg px-4 py-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              At 70%+ adoption consider Vercel Enterprise + Neon Scale for SLA guarantees — still under £100/mo total infra.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: 'green' }) {
  const bg = highlight === 'green'
    ? 'bg-green-50 dark:bg-green-950/30'
    : 'bg-gray-50 dark:bg-gray-800/50'
  return (
    <div className={`${bg} rounded-lg p-3 text-center`}>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  )
}

function MetricCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: 'green' }) {
  const bg = highlight === 'green'
    ? 'bg-green-50 dark:bg-green-950/30'
    : 'bg-gray-50 dark:bg-gray-800/50'
  return (
    <div className={`${bg} rounded-lg p-3`}>
      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  )
}

function AssumptionSlider({ label, value, onChange, min, max, step, suffix }: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  suffix: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-teal-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  )
}
