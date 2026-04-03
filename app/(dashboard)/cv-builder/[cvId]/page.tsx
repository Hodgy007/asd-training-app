'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { CvWizard } from '@/components/cv-builder/cv-wizard'
import type { CVData } from '@/components/cv-builder/cv-wizard'

export default function CvWizardPage() {
  const params = useParams()
  const router = useRouter()
  const cvId = params.cvId as string

  const [cvData, setCvData] = useState<CVData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchCV() {
      try {
        const res = await fetch(`/api/cv-builder/${cvId}`)
        if (res.status === 404) {
          setNotFound(true)
          return
        }
        if (res.ok) {
          const data = await res.json()
          setCvData(data)
        }
      } catch {
        // fetch error
      } finally {
        setLoading(false)
      }
    }
    fetchCV()
  }, [cvId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress bar skeleton */}
        <div className="card animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-32 bg-calm-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-24 bg-calm-100 dark:bg-slate-600 rounded" />
          </div>
          <div className="flex items-center justify-between gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div className="w-10 h-10 bg-calm-200 dark:bg-slate-700 rounded-full" />
                <div className="hidden md:block h-3 w-16 bg-calm-100 dark:bg-slate-600 rounded mt-2" />
              </div>
            ))}
          </div>
        </div>

        {/* Content skeleton */}
        <div className="card animate-pulse space-y-4">
          <div className="h-3 w-20 bg-calm-100 dark:bg-slate-600 rounded" />
          <div className="h-6 w-48 bg-calm-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-64 bg-calm-100 dark:bg-slate-600 rounded" />
          <div className="space-y-3 mt-6">
            <div className="h-10 bg-calm-100 dark:bg-slate-600 rounded-xl" />
            <div className="h-10 bg-calm-100 dark:bg-slate-600 rounded-xl" />
            <div className="h-10 bg-calm-100 dark:bg-slate-600 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center py-16">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">CV not found</h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">
            This CV may have been deleted or you may not have access to it.
          </p>
          <button
            onClick={() => router.push('/cv-builder')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to CV Builder
          </button>
        </div>
      </div>
    )
  }

  if (!cvData) return null

  return (
    <div className="max-w-4xl mx-auto">
      <CvWizard cvId={cvId} initialData={cvData} />
    </div>
  )
}
