'use client'

import { useState, useEffect } from 'react'
import { format, subDays } from 'date-fns'
import { Printer, BarChart2, AlertTriangle, Download } from 'lucide-react'
import { DomainChart } from '@/components/observations/domain-chart'
import { groupObservationsByWeek } from '@/lib/observations'
import { DOMAIN_LABELS, FREQUENCY_LABELS, CONTEXT_LABELS } from '@/lib/constants'

interface Child {
  id: string
  name: string
  dateOfBirth: string
  notes?: string | null
}

interface Observation {
  id: string
  date: string
  behaviourType: string
  domain: string
  frequency: string
  context: string
  notes?: string | null
}

interface ChildReport {
  child: Child
  observations: Observation[]
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ChildReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [dateRange, setDateRange] = useState(28) // days

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch('/api/children')
        if (!res.ok) return
        const children: Child[] = await res.json()

        const reportData = await Promise.all(
          children.map(async (child) => {
            const obsRes = await fetch(`/api/children/${child.id}/observations`)
            const observations: Observation[] = obsRes.ok ? await obsRes.json() : []
            return { child, observations }
          })
        )
        setReports(reportData)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  function handlePrint() {
    window.print()
  }

  const cutoffDate = subDays(new Date(), dateRange)
  const filteredReports =
    selectedChild === 'all'
      ? reports
      : reports.filter((r) => r.child.id === selectedChild)

  const displayReports = filteredReports.map((r) => ({
    ...r,
    observations: r.observations.filter((o) => new Date(o.date) >= cutoffDate),
  }))

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-48 bg-calm-200 rounded" />
        <div className="h-32 bg-calm-200 rounded-2xl" />
        <div className="h-64 bg-calm-200 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 mt-1">
            Generate and print observation reports for healthcare appointments.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="btn-primary flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print report
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-4 no-print">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Child</label>
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="input"
          >
            <option value="all">All children</option>
            {reports.map((r) => (
              <option key={r.child.id} value={r.child.id}>
                {r.child.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="label">Date range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="input"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 2 weeks</option>
            <option value={28}>Last 4 weeks</option>
            <option value={90}>Last 3 months</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Disclaimer for print */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Important disclaimer</p>
          <p className="text-sm text-amber-700 mt-0.5">
            This report contains observational data only and does not constitute a diagnosis.
            Share this document with your GP, health visitor, or SENCO for professional assessment.
            Observations were recorded by a practitioner using the Ambitious about Autism tool.
          </p>
        </div>
      </div>

      {displayReports.length === 0 ? (
        <div className="card text-center py-12">
          <BarChart2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">No children to report on. Add children and observations first.</p>
        </div>
      ) : (
        displayReports.map(({ child, observations }) => {
          const dob = new Date(child.dateOfBirth)
          const typedObs = observations.map((o) => ({
            ...o,
            date: new Date(o.date),
            domain: o.domain as 'SOCIAL_COMMUNICATION' | 'BEHAVIOUR_AND_PLAY' | 'SENSORY_RESPONSES',
            frequency: o.frequency as 'RARE' | 'SOMETIMES' | 'OFTEN',
            context: o.context as 'HOME' | 'NURSERY' | 'OUTDOORS' | 'OTHER',
          }))
          const weeklyData = groupObservationsByWeek(typedObs, 4)

          const domainGroups: Record<string, typeof typedObs> = {
            SOCIAL_COMMUNICATION: typedObs.filter((o) => o.domain === 'SOCIAL_COMMUNICATION'),
            BEHAVIOUR_AND_PLAY: typedObs.filter((o) => o.domain === 'BEHAVIOUR_AND_PLAY'),
            SENSORY_RESPONSES: typedObs.filter((o) => o.domain === 'SENSORY_RESPONSES'),
          }

          return (
            <div key={child.id} className="card print-break space-y-6">
              {/* Child header */}
              <div className="border-b border-calm-200 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{child.name}</h2>
                    <p className="text-sm text-slate-400">
                      Date of birth: {format(dob, 'dd MMMM yyyy')} &middot; Report generated:{' '}
                      {format(new Date(), 'dd MMMM yyyy')}
                    </p>
                    <p className="text-sm text-slate-400">
                      Period: Last {dateRange} days &middot; Total observations: {observations.length}
                    </p>
                  </div>
                  <div className="text-right no-print">
                    <p className="text-xs text-slate-400">Ambitious about Autism</p>
                  </div>
                </div>
                {child.notes && (
                  <p className="text-sm text-slate-600 mt-3 bg-calm-50 rounded-xl p-3">
                    <strong>Practitioner notes:</strong> {child.notes}
                  </p>
                )}
              </div>

              {observations.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">
                  No observations in selected period.
                </p>
              ) : (
                <>
                  {/* Chart */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-slate-400" />
                      Weekly Observation Trends
                    </h3>
                    <DomainChart data={weeklyData} />
                  </div>

                  {/* Domain breakdown */}
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">Observations by Domain</h3>
                    <div className="space-y-4">
                      {Object.entries(domainGroups).map(([domain, obs]) => {
                        if (obs.length === 0) return null
                        return (
                          <div key={domain}>
                            <h4 className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${
                                  domain === 'SOCIAL_COMMUNICATION'
                                    ? 'bg-primary-500'
                                    : domain === 'BEHAVIOUR_AND_PLAY'
                                      ? 'bg-sage-500'
                                      : 'bg-warm-400'
                                }`}
                              />
                              {DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS]} ({obs.length})
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-xs text-slate-400 border-b border-calm-200">
                                    <th className="pb-2 pr-4 font-medium">Date</th>
                                    <th className="pb-2 pr-4 font-medium">Behaviour</th>
                                    <th className="pb-2 pr-4 font-medium">Frequency</th>
                                    <th className="pb-2 pr-4 font-medium">Context</th>
                                    <th className="pb-2 font-medium">Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-calm-100">
                                  {obs.map((o) => (
                                    <tr key={o.id}>
                                      <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">
                                        {format(new Date(o.date), 'dd/MM/yyyy')}
                                      </td>
                                      <td className="py-2 pr-4 text-slate-800">{o.behaviourType}</td>
                                      <td className="py-2 pr-4 text-slate-500">
                                        {FREQUENCY_LABELS[o.frequency as keyof typeof FREQUENCY_LABELS]}
                                      </td>
                                      <td className="py-2 pr-4 text-slate-500">
                                        {CONTEXT_LABELS[o.context as keyof typeof CONTEXT_LABELS]}
                                      </td>
                                      <td className="py-2 text-slate-400 text-xs max-w-xs truncate">
                                        {o.notes || '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })
      )}

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-slate-400 mt-8 pt-4 border-t">
        <p>Generated by Ambitious about Autism Practitioner Tool &middot; {format(new Date(), 'dd MMMM yyyy')}</p>
        <p className="mt-1">This document is for informational purposes only and does not constitute a clinical diagnosis.</p>
      </div>
    </div>
  )
}
