'use client'

import { useEffect, useMemo, useState } from 'react'
import { JobList } from '@/components/jobs/job-list'
import { JobDetail, type JobDetailData } from '@/components/jobs/job-detail'
import type { JobCardData } from '@/components/jobs/job-card'

export function JobsClient({ initialJobs, initialSelectedId }: { initialJobs: (JobCardData & JobDetailData)[]; initialSelectedId: string | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? initialJobs[0]?.id ?? null)

  const selected = useMemo(() => initialJobs.find((j) => j.id === selectedId) ?? null, [initialJobs, selectedId])

  useEffect(() => {
    if (!selected) return
    const url = `/jobs/${selected.id}`
    if (typeof window !== 'undefined' && window.location.pathname !== url) {
      window.history.replaceState(null, '', url)
    }
  }, [selected])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Jobs</h1>
      <div className="grid md:grid-cols-[360px_1fr] gap-4 min-h-[70vh]">
        <JobList jobs={initialJobs} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="hidden md:block">
          <JobDetail job={selected} />
        </div>
      </div>
      <noscript>
        <p className="text-sm text-slate-600 mt-4">JavaScript is required for this page.</p>
      </noscript>
    </div>
  )
}
