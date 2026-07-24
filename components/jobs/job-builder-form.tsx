'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Option = { id: string; name: string }

export type JobFormInitial = Partial<{
  id: string
  title: string
  employer: string
  employerLogoUrl: string | null
  location: string
  locationType: 'ONSITE' | 'HYBRID' | 'REMOTE'
  employmentType: 'INTERNSHIP' | 'APPRENTICESHIP' | 'PART_TIME' | 'FULL_TIME' | 'VOLUNTEER'
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
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED'
  targetOrgIds: string[]
  targetRoles: string[]
}>

export function JobBuilderForm({
  initial,
  organisations,
}: {
  initial?: JobFormInitial
  organisations: Option[]
}) {
  const router = useRouter()
  const [values, setValues] = useState<JobFormInitial>({
    status: 'DRAFT',
    locationType: 'ONSITE',
    employmentType: 'INTERNSHIP',
    skills: [],
    targetOrgIds: [],
    targetRoles: [],
    ...initial,
  })
  const [applyMode, setApplyMode] = useState<'url' | 'email'>(initial?.applyEmail ? 'email' : 'url')
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof JobFormInitial>(k: K, v: JobFormInitial[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }))

  async function uploadLogo(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/super-admin/jobs/upload-logo', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Logo upload failed')
    const { url } = await res.json()
    set('employerLogoUrl', url)
  }

  async function submit(publish: boolean) {
    setError(null)
    setSaving(true)
    try {
      const payload = {
        ...values,
        status: publish ? 'PUBLISHED' : values.status ?? 'DRAFT',
        applyUrl: applyMode === 'url' ? values.applyUrl ?? null : null,
        applyEmail: applyMode === 'email' ? values.applyEmail ?? null : null,
      }
      const url = initial?.id
        ? `/api/super-admin/jobs/${initial.id}`
        : '/api/super-admin/jobs'
      const method = initial?.id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const msg = await res.json().catch(() => ({}))
        throw new Error(msg.error ?? 'Failed to save')
      }
      const { job } = await res.json()
      router.push(`/super-admin/jobs/${job.id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="space-y-8 max-w-4xl" onSubmit={(e) => { e.preventDefault(); submit(false) }}>
      {error && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Basics</h2>
        <label className="block">
          <span className="text-sm">Title</span>
          <input className="input" value={values.title ?? ''} onChange={(e) => set('title', e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm">Employer</span>
          <input className="input" value={values.employer ?? ''} onChange={(e) => set('employer', e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm">Employer logo</span>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
          {values.employerLogoUrl && (
            <img src={values.employerLogoUrl} alt="" className="h-12 mt-2 rounded" />
          )}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm">Location</span>
            <input className="input" value={values.location ?? ''} onChange={(e) => set('location', e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm">Location type</span>
            <select className="input" value={values.locationType} onChange={(e) => set('locationType', e.target.value as never)}>
              <option value="ONSITE">On-site</option>
              <option value="HYBRID">Hybrid</option>
              <option value="REMOTE">Remote</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="text-sm">Employment type</span>
          <select className="input" value={values.employmentType} onChange={(e) => set('employmentType', e.target.value as never)}>
            <option value="INTERNSHIP">Internship</option>
            <option value="APPRENTICESHIP">Apprenticeship</option>
            <option value="PART_TIME">Part-time</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="VOLUNTEER">Volunteer</option>
          </select>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">When &amp; how much</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm">Hours / week</span>
            <input className="input" value={values.hoursPerWeek ?? ''} onChange={(e) => set('hoursPerWeek', e.target.value)} placeholder="9am–6pm, Mon–Fri" />
          </label>
          <label className="block">
            <span className="text-sm">Start date</span>
            <input className="input" value={values.startDate ?? ''} onChange={(e) => set('startDate', e.target.value)} placeholder="May 2026" />
          </label>
          <label className="block">
            <span className="text-sm">Duration</span>
            <input className="input" value={values.duration ?? ''} onChange={(e) => set('duration', e.target.value)} placeholder="6 months" />
          </label>
          <label className="block">
            <span className="text-sm">Salary</span>
            <input className="input" value={values.salary ?? ''} onChange={(e) => set('salary', e.target.value)} placeholder="£28,843 pro rata" />
          </label>
          <label className="block col-span-2">
            <span className="text-sm">Closing date</span>
            <input type="date" className="input" value={values.closingDate?.slice(0, 10) ?? ''} onChange={(e) => set('closingDate', e.target.value)} required />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">The role</h2>
        <label className="block">
          <span className="text-sm">Short summary (list view, max 240 chars)</span>
          <input className="input" maxLength={240} value={values.summary ?? ''} onChange={(e) => set('summary', e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm">Full description</span>
          <textarea className="input min-h-[160px]" value={values.description ?? ''} onChange={(e) => set('description', e.target.value)} required />
        </label>
        <div>
          <span className="text-sm">Skills</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {(values.skills ?? []).map((s, i) => (
              <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs">
                {s}
                <button type="button" className="ml-2 text-slate-500" onClick={() => set('skills', (values.skills ?? []).filter((_, k) => k !== i))}>×</button>
              </span>
            ))}
            <input
              className="input max-w-[12rem]"
              placeholder="Add skill + Enter"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && skillInput.trim()) {
                  e.preventDefault()
                  set('skills', [...(values.skills ?? []), skillInput.trim()])
                  setSkillInput('')
                }
              }}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Support on offer</h2>
        <textarea
          className="input min-h-[120px]"
          value={values.autismFriendlyNotes ?? ''}
          onChange={(e) => set('autismFriendlyNotes', e.target.value)}
          placeholder="Mentorship, quiet workspace, buddy system, interview accommodations…"
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Apply</h2>
        <div className="flex gap-4 text-sm">
          <label><input type="radio" checked={applyMode === 'url'} onChange={() => setApplyMode('url')} /> External URL</label>
          <label><input type="radio" checked={applyMode === 'email'} onChange={() => setApplyMode('email')} /> Email</label>
        </div>
        {applyMode === 'url' ? (
          <input className="input" placeholder="https://…" value={values.applyUrl ?? ''} onChange={(e) => set('applyUrl', e.target.value)} />
        ) : (
          <input className="input" placeholder="recruitment@example.org" value={values.applyEmail ?? ''} onChange={(e) => set('applyEmail', e.target.value)} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Contact name" value={values.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} />
          <input className="input" placeholder="Contact email" value={values.contactEmail ?? ''} onChange={(e) => set('contactEmail', e.target.value)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-lg">Who can see this</h2>
        <label className="block">
          <span className="text-sm">Status</span>
          <select className="input" value={values.status} onChange={(e) => set('status', e.target.value as never)}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm">Organisations (empty = all)</span>
          <select multiple className="input min-h-[8rem]" value={values.targetOrgIds ?? []} onChange={(e) => set('targetOrgIds', Array.from(e.target.selectedOptions).map((o) => o.value))}>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
      </section>

      <div className="flex gap-3 sticky bottom-0 bg-white dark:bg-slate-900 py-3 border-t">
        <button type="submit" disabled={saving} className="border px-4 py-2 rounded-lg text-sm">
          Save as draft
        </button>
        <button type="button" disabled={saving} onClick={() => submit(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm">
          Save &amp; publish
        </button>
      </div>
    </form>
  )
}
