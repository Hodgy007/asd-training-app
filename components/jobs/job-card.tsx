'use client'

import { format } from 'date-fns'

export type JobCardData = {
  id: string
  title: string
  employer: string
  employerLogoUrl: string | null
  location: string
  employmentType: string
  salary: string | null
  closingDate: string
  status: string
  hasAssignment: boolean
}

const TYPE_BADGE: Record<string, string> = {
  INTERNSHIP: 'bg-emerald-100 text-emerald-800',
  APPRENTICESHIP: 'bg-violet-100 text-violet-800',
  PART_TIME: 'bg-sky-100 text-sky-800',
  FULL_TIME: 'bg-slate-200 text-slate-800',
  VOLUNTEER: 'bg-teal-100 text-teal-800',
}

export function JobCard({ job, selected, onSelect }: { job: JobCardData; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 transition ${
        selected
          ? 'bg-primary-50 border-l-4 border-primary-600'
          : 'hover:bg-slate-50 border-l-4 border-transparent'
      }`}
    >
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center font-semibold text-slate-700 shrink-0 overflow-hidden">
          {job.employerLogoUrl ? (
            <img src={job.employerLogoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            job.employer.slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{job.title}</div>
          <div className="text-xs text-slate-600 truncate">{job.employer} · {job.location}</div>
          <div className="flex flex-wrap gap-1 mt-2 text-[11px]">
            <span className={`px-1.5 rounded ${TYPE_BADGE[job.employmentType] ?? 'bg-slate-100'}`}>
              {job.employmentType.replace('_', ' ')}
            </span>
            {job.salary && <span className="bg-slate-100 px-1.5 rounded">{job.salary}</span>}
            <span className="bg-amber-100 text-amber-800 px-1.5 rounded">Closes {format(new Date(job.closingDate), 'd MMM')}</span>
            {job.hasAssignment && <span className="bg-sky-100 text-sky-800 px-1.5 rounded">Assigned to you</span>}
          </div>
        </div>
      </div>
    </button>
  )
}
