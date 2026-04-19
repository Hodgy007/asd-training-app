'use client'

import { format } from 'date-fns'

export type JobDetailData = {
  id: string
  title: string
  employer: string
  employerLogoUrl: string | null
  location: string
  locationType: string
  employmentType: string
  summary: string
  description: string
  skills: string[]
  autismFriendlyNotes: string | null
  salary: string | null
  hoursPerWeek: string | null
  startDate: string | null
  duration: string | null
  applyUrl: string | null
  applyEmail: string | null
  contactName: string | null
  contactEmail: string | null
  closingDate: string
  status: string
  attachments: { id: string; filename: string; url: string; sizeBytes: number }[]
  assignmentNote: string | null
}

function formatSize(n: number) {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function JobDetail({ job }: { job: JobDetailData | null }) {
  if (!job) {
    return (
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-8 text-slate-500">
        Select an opportunity to view the full detail.
      </div>
    )
  }

  const closed = job.status === 'CLOSED'
  const applyHref = job.applyUrl
    ? job.applyUrl
    : job.applyEmail
    ? `mailto:${job.applyEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`
    : null

  return (
    <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-auto">
      {closed && (
        <div className="bg-amber-100 text-amber-900 px-6 py-3 text-sm">This opportunity has closed.</div>
      )}

      <div className="p-6 border-b">
        <div className="flex gap-4 items-start">
          <div className="h-14 w-14 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
            {job.employerLogoUrl ? (
              <img src={job.employerLogoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-semibold">{job.employer.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{job.title}</h2>
            <div className="text-slate-600">{job.employer} · {job.location}</div>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">{job.employmentType.replace('_', ' ')}</span>
              {job.salary && <span className="bg-slate-100 px-2 py-0.5 rounded">{job.salary}</span>}
              {job.duration && <span className="bg-slate-100 px-2 py-0.5 rounded">{job.duration}</span>}
              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Closes {format(new Date(job.closingDate), 'd MMM yyyy')}</span>
            </div>
          </div>
          {applyHref && !closed && (
            <a
              href={applyHref}
              target={job.applyUrl ? '_blank' : undefined}
              rel="noopener noreferrer"
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap"
            >
              Apply ↗
            </a>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5 text-sm">
        {job.assignmentNote && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
            <div className="font-semibold text-sky-900 mb-1">Why this was suggested for you</div>
            <div className="text-sky-900">{job.assignmentNote}</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {job.hoursPerWeek && <div><div className="text-slate-500">Hours</div><div>{job.hoursPerWeek}</div></div>}
          {job.startDate && <div><div className="text-slate-500">Start</div><div>{job.startDate}</div></div>}
          <div><div className="text-slate-500">Type</div><div>{job.employmentType.replace('_', ' ')}</div></div>
          {job.contactEmail && <div><div className="text-slate-500">Contact</div><div className="truncate">{job.contactEmail}</div></div>}
        </div>

        <div>
          <h3 className="font-semibold mb-1">About the role</h3>
          <div className="whitespace-pre-wrap text-slate-700">{job.description}</div>
        </div>

        {job.skills.length > 0 && (
          <div>
            <h3 className="font-semibold mb-1">Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => (
                <span key={s} className="text-xs bg-slate-100 px-2 py-1 rounded">{s}</span>
              ))}
            </div>
          </div>
        )}

        {job.autismFriendlyNotes && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h3 className="font-semibold text-emerald-900 mb-1">Support on offer</h3>
            <div className="whitespace-pre-wrap text-emerald-900">{job.autismFriendlyNotes}</div>
          </div>
        )}

        {job.attachments.length > 0 && (
          <div>
            <h3 className="font-semibold mb-1">Attachments</h3>
            <ul className="space-y-1">
              {job.attachments.map((a) => (
                <li key={a.id}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 text-sm">
                    {a.filename} · {formatSize(a.sizeBytes)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
