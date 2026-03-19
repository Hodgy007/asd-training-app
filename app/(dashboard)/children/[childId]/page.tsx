'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  BarChart2,
  Sparkles,
  User,
  Calendar,
  FileText,
  Edit2,
  Trash2,
} from 'lucide-react'
import { differenceInYears, differenceInMonths, format } from 'date-fns'
import { ObservationForm } from '@/components/children/observation-form'
import { ObservationTable } from '@/components/observations/observation-table'
import { DomainChart } from '@/components/observations/domain-chart'
import { WeeklySummary } from '@/components/observations/weekly-summary'
import { InsightsPanel } from '@/components/ai/insights-panel'
import { GenerateReportBtn } from '@/components/ai/generate-report-btn'
import { groupObservationsByWeek } from '@/lib/observations'
import { clsx } from 'clsx'

type Tab = 'overview' | 'tracker' | 'charts' | 'insights'

interface Child {
  id: string
  name: string
  dateOfBirth: string
  notes?: string | null
  createdAt: string
}

interface Observation {
  id: string
  childId: string
  date: string
  behaviourType: string
  domain: string
  frequency: string
  context: string
  notes?: string | null
  createdAt: string
  updatedAt: string
}

interface AiInsight {
  id: string
  childId: string
  generatedAt: string
  summary: string
  patterns: string
  recommendations: string
  disclaimer: string
}

export default function ChildPage() {
  const params = useParams()
  const router = useRouter()
  const childId = params.childId as string

  const [tab, setTab] = useState<Tab>('overview')
  const [child, setChild] = useState<Child | null>(null)
  const [observations, setObservations] = useState<Observation[]>([])
  const [insight, setInsight] = useState<AiInsight | null>(null)
  const [showObsForm, setShowObsForm] = useState(false)
  const [insightLoading, setInsightLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [childRes, obsRes, insightRes] = await Promise.all([
        fetch(`/api/children/${childId}`),
        fetch(`/api/children/${childId}/observations`),
        fetch(`/api/children/${childId}/insights`),
      ])

      if (!childRes.ok) {
        router.push('/children')
        return
      }

      const [childData, obsData, insightData] = await Promise.all([
        childRes.json(),
        obsRes.ok ? obsRes.json() : [],
        insightRes.ok ? insightRes.json() : null,
      ])

      setChild(childData)
      setObservations(Array.isArray(obsData) ? obsData : [])
      setInsight(insightData)
    } finally {
      setLoading(false)
    }
  }, [childId, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  async function handleDelete() {
    if (!confirm(`Delete ${child?.name} and all their observations? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/children/${childId}`, { method: 'DELETE' })
      if (res.ok) router.push('/children')
    } finally {
      setDeleting(false)
    }
  }

  async function handleInsightGenerated() {
    setInsightLoading(true)
    await fetchData()
    setInsightLoading(false)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-calm-200 rounded" />
          <div className="h-32 bg-calm-200 rounded-2xl" />
          <div className="h-64 bg-calm-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!child) return null

  const dob = new Date(child.dateOfBirth)
  const ageYears = differenceInYears(new Date(), dob)
  const ageMonths = differenceInMonths(new Date(), dob) % 12
  const ageString =
    ageYears === 0
      ? `${ageMonths} months`
      : ageMonths === 0
        ? `${ageYears} years`
        : `${ageYears}y ${ageMonths}m`

  const typedObservations = observations.map((o) => ({
    ...o,
    date: new Date(o.date),
    domain: o.domain as 'SOCIAL_COMMUNICATION' | 'BEHAVIOUR_AND_PLAY' | 'SENSORY_RESPONSES',
    frequency: o.frequency as 'RARE' | 'SOMETIMES' | 'OFTEN',
    context: o.context as 'HOME' | 'NURSERY' | 'OUTDOORS' | 'OTHER',
    createdAt: new Date(o.createdAt),
    updatedAt: new Date(o.updatedAt),
  }))

  const weeklyData = groupObservationsByWeek(typedObservations, 4)

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: User },
    { id: 'tracker' as Tab, label: '4-Week Tracker', icon: ClipboardList },
    { id: 'charts' as Tab, label: 'Charts', icon: BarChart2 },
    { id: 'insights' as Tab, label: 'AI Insights', icon: Sparkles },
  ]

  const domainCounts = {
    SOCIAL_COMMUNICATION: observations.filter((o) => o.domain === 'SOCIAL_COMMUNICATION').length,
    BEHAVIOUR_AND_PLAY: observations.filter((o) => o.domain === 'BEHAVIOUR_AND_PLAY').length,
    SENSORY_RESPONSES: observations.filter((o) => o.domain === 'SENSORY_RESPONSES').length,
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/children"
            className="p-2 rounded-xl text-slate-500 hover:bg-calm-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-primary-700">
                {child.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{child.name}</h1>
              <p className="text-sm text-slate-400">
                {ageString} old &middot; Born {format(dob, 'dd MMM yyyy')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowObsForm(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Log observation
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete child"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-calm-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center',
                tab === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-primary-600">{observations.length}</p>
              <p className="text-sm text-slate-500 mt-1">Total observations</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-sage-600">
                {Object.values(domainCounts).filter((v) => v > 0).length}
              </p>
              <p className="text-sm text-slate-500 mt-1">Domains recorded</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-warm-500">
                {observations.filter((o) => o.frequency === 'OFTEN').length}
              </p>
              <p className="text-sm text-slate-500 mt-1">&ldquo;Often&rdquo; behaviours</p>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              Child Details
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-300" />
                <div>
                  <p className="text-xs text-slate-400">Date of birth</p>
                  <p className="text-sm text-slate-700">
                    {format(dob, 'dd MMMM yyyy')} ({ageString})
                  </p>
                </div>
              </div>
              {child.notes && (
                <div className="flex items-start gap-3">
                  <Edit2 className="h-4 w-4 text-slate-300 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-400">Notes</p>
                    <p className="text-sm text-slate-700">{child.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-4">Domain Summary</h2>
            <div className="space-y-3">
              {[
                { domain: 'SOCIAL_COMMUNICATION', label: 'Social Communication', colour: 'bg-primary-500' },
                { domain: 'BEHAVIOUR_AND_PLAY', label: 'Behaviour & Play', colour: 'bg-sage-500' },
                { domain: 'SENSORY_RESPONSES', label: 'Sensory Responses', colour: 'bg-warm-400' },
              ].map(({ domain, label, colour }) => {
                const count = domainCounts[domain as keyof typeof domainCounts]
                const max = Math.max(...Object.values(domainCounts), 1)
                return (
                  <div key={domain}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{label}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                    <div className="h-2 bg-calm-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colour} rounded-full transition-all`}
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'tracker' && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">4-Week Observation Log</h2>
            <button
              onClick={() => setShowObsForm(true)}
              className="btn-sage text-sm flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          <ObservationTable
            observations={typedObservations.slice().reverse()}
            childId={childId}
            onDeleted={fetchData}
          />
        </div>
      )}

      {tab === 'charts' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-5">Weekly Trends (4 Weeks)</h2>
            <DomainChart data={weeklyData} />
          </div>
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-4">Weekly Summary</h2>
            <WeeklySummary data={weeklyData} />
          </div>
        </div>
      )}

      {tab === 'insights' && (
        <div className="space-y-5">
          <div className="card">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-semibold text-slate-900">AI-Powered Insights</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  Powered by Google Gemini &middot; Pattern recognition only
                </p>
              </div>
              <GenerateReportBtn
                childId={childId}
                hasObservations={observations.length > 0}
                onGenerated={handleInsightGenerated}
              />
            </div>
            <InsightsPanel insight={insight} loading={insightLoading} />
          </div>
        </div>
      )}

      {showObsForm && (
        <ObservationForm
          childId={childId}
          childName={child.name}
          onClose={() => {
            setShowObsForm(false)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
