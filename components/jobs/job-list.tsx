'use client'

import { useMemo, useState } from 'react'
import { JobCard, type JobCardData } from './job-card'

export function JobList({
  jobs,
  selectedId,
  onSelect,
}: {
  jobs: JobCardData[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'closing'>('newest')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? jobs.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            j.employer.toLowerCase().includes(q) ||
            j.location.toLowerCase().includes(q),
        )
      : jobs
    return [...list].sort((a, b) =>
      sort === 'closing'
        ? new Date(a.closingDate).getTime() - new Date(b.closingDate).getTime()
        : 0,
    )
  }, [jobs, search, sort])

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden flex flex-col">
      <div className="p-3 border-b bg-slate-50 dark:bg-slate-800 sticky top-0 space-y-2">
        <input
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Search roles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className={`px-2 py-1 rounded ${sort === 'newest' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
            onClick={() => setSort('newest')}
          >
            Newest
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded ${sort === 'closing' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
            onClick={() => setSort('closing')}
          >
            Closing soon
          </button>
        </div>
      </div>
      <ul className="divide-y overflow-auto">
        {filtered.map((j) => (
          <li key={j.id}>
            <JobCard job={j} selected={selectedId === j.id} onSelect={() => onSelect(j.id)} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="p-6 text-center text-slate-500 text-sm">No opportunities to show yet — check back soon.</li>
        )}
      </ul>
    </div>
  )
}
