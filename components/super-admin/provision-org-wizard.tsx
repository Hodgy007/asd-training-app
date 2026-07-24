'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ORG_TYPES, ORG_TYPE_LABELS } from '@/lib/rbac'
import { Building2, GraduationCap, Check, AlertCircle, Loader2 } from 'lucide-react'

type Program = { id: string; name: string }

type Result = {
  org: { id: string; name: string }
  admin: { email: string }
  emailSent: boolean
  emailError?: string
}

const STEPS = ['Organisation', 'Training', 'Administrator', 'Review'] as const

/** Slugify a name into the lowercase-hyphenated form the API requires. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

export function ProvisionOrgWizard({ programs }: { programs: Program[] }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [organisationType, setOrganisationType] = useState<(typeof ORG_TYPES)[number]>('SCHOOL')
  const [isParentOrg, setIsParentOrg] = useState(false)
  const [allowedProgramIds, setAllowedProgramIds] = useState<string[]>([])
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  function updateName(v: string) {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  function toggleProgram(id: string) {
    setAllowedProgramIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  const stepValid = [
    name.trim().length > 0 && /^[a-z0-9-]+$/.test(slug),
    true, // programmes may legitimately be empty and assigned later
    adminName.trim().length > 0 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail.trim()),
    true,
  ][step]

  async function submit() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/super-admin/organisations/provision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          organisationType,
          isParentOrg,
          allowedProgramIds,
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Could not provision the organisation.')
      setResult(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not provision the organisation.')
    } finally {
      setSaving(false)
    }
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">
              {result.org.name} is set up
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
              {result.emailSent
                ? `An activation link has been emailed to ${result.admin.email}. It expires in 7 days.`
                : 'The organisation and its administrator were created.'}
            </p>
          </div>
        </div>

        {!result.emailSent && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold">No invite email was sent</p>
              <p className="mt-1">
                {result.emailError ?? 'The email could not be delivered.'} Open the organisation and
                use <strong>Resend invite</strong> on the administrator to try again.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/super-admin/organisations/${result.org.id}`)}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Open {result.org.name}
          </button>
          <button
            onClick={() => router.push('/super-admin/organisations')}
            className="border px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Back to organisations
          </button>
        </div>
      </div>
    )
  }

  // ── Wizard ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? 'step' : undefined}
            className={`px-3 py-1.5 rounded-full border ${
              i === step
                ? 'bg-slate-900 text-white border-slate-900'
                : i < step
                  ? 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-calm-200 dark:border-slate-600'
                  : 'bg-transparent text-slate-400 border-calm-200 dark:border-slate-700'
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Organisation name</span>
            <input
              className="input mt-1"
              value={name}
              onChange={(e) => updateName(e.target.value)}
              placeholder="e.g. Oakfield Academy"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Web address slug</span>
            <input
              className="input mt-1"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              placeholder="oakfield-academy"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
              Lowercase letters, numbers and hyphens. Filled in from the name — edit if you need to.
            </span>
          </label>

          <fieldset>
            <legend className="text-sm font-semibold mb-2">Type</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ORG_TYPES.map((t) => {
                const Icon = t === 'EMPLOYER' ? Building2 : GraduationCap
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setOrganisationType(t)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${
                      organisationType === t
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {ORG_TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={isParentOrg}
              onChange={(e) => setIsParentOrg(e.target.checked)}
            />
            <span className="text-sm">
              This is a parent organisation
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                A trust or group that manages child organisations of its own.
              </span>
            </span>
          </label>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Choose the training this organisation&apos;s learners can access. You can change this
            later, and leaving it empty is fine.
          </p>
          {programs.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No training programmes exist yet.
            </p>
          ) : (
            <div className="space-y-2">
              {programs.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 border border-calm-200 dark:border-slate-600 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-calm-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={allowedProgramIds.includes(p.id)}
                    onChange={() => toggleProgram(p.id)}
                  />
                  <span className="text-sm">{p.name}</span>
                </label>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This person administers the organisation and invites its learners. They&apos;ll get an
            email with a link to set their own password — no password is created or sent here.
          </p>
          <label className="block">
            <span className="text-sm font-semibold">Full name</span>
            <input
              className="input mt-1"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="e.g. Priya Shah"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Email address</span>
            <input
              type="email"
              className="input mt-1"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="priya.shah@oakfield.sch.uk"
            />
          </label>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3">
          <dl className="text-sm border border-calm-200 dark:border-slate-600 rounded-xl divide-y divide-calm-100 dark:divide-slate-700">
            {[
              ['Organisation', name],
              ['Slug', slug],
              ['Type', ORG_TYPE_LABELS[organisationType]],
              ['Parent organisation', isParentOrg ? 'Yes' : 'No'],
              [
                'Training',
                allowedProgramIds.length === 0
                  ? 'None yet'
                  : programs
                      .filter((p) => allowedProgramIds.includes(p.id))
                      .map((p) => p.name)
                      .join(', '),
              ],
              ['Administrator', `${adminName} (${adminEmail})`],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-4 px-3 py-2.5">
                <dt className="w-40 flex-shrink-0 text-slate-500 dark:text-slate-400">{k}</dt>
                <dd className="font-medium break-words">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Creating this will email {adminEmail || 'the administrator'} an activation link valid
            for 7 days.
          </p>
        </section>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-calm-200 dark:border-slate-700">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={saving}
            className="border px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!stepValid}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Setting up…' : 'Create and send invite'}
          </button>
        )}
      </div>
    </div>
  )
}
