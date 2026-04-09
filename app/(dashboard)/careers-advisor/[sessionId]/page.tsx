'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AdvisorWizard } from '@/components/careers-advisor/advisor-wizard'
import type { AdvisorAnswers, AdvisorReport } from '@/types'

interface SessionData {
  id: string
  status: 'IN_PROGRESS' | 'COMPLETE'
  currentStep: number
  answers: AdvisorAnswers | null
  report: AdvisorReport | null
}

export default function CareersAdvisorSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [data, setData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/careers-advisor/${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Session not found')
        return r.json()
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-slate-500 dark:text-slate-400">{error || 'Session not found'}</p>
        <Link
          href="/careers-advisor"
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sessions
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-page-enter">
      <Link
        href="/careers-advisor"
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sessions
      </Link>

      <AdvisorWizard
        sessionId={data.id}
        initialAnswers={data.answers ?? {}}
        initialStep={data.currentStep}
        initialReport={data.report}
        initialStatus={data.status}
      />
    </div>
  )
}
