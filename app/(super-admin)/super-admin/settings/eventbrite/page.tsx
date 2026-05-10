'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Ticket,
  RefreshCw,
  CheckCircle,
  XCircle,
  Save,
  Wifi,
  WifiOff,
  ExternalLink,
} from 'lucide-react'
import { clsx } from 'clsx'

type EmailMatchPolicy = 'STRICT' | 'AUTO_INVITE' | 'CLAIM_LINK'

interface EventbriteConfig {
  id: string
  hasToken: boolean
  webhookId: string | null
  emailMatchPolicy: EmailMatchPolicy
  configured: boolean
  lastSyncAt: string | null
}

const POLICY_LABELS: Record<EmailMatchPolicy, { title: string; help: string }> = {
  AUTO_INVITE: {
    title: 'Auto-invite (recommended)',
    help: 'When someone books on Eventbrite using an unknown email, we create them an account on the Public Toolkit and email them a magic-link to set their password and sign in.',
  },
  STRICT: {
    title: 'Strict',
    help: 'Only count bookings whose Eventbrite email matches an existing platform user. Unknown emails are ignored.',
  },
  CLAIM_LINK: {
    title: 'Claim link',
    help: 'Unknown emails get a "claim your booking" email pointing at /register, without pre-creating an account.',
  },
}

export default function EventbriteSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [hasToken, setHasToken] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [policy, setPolicy] = useState<EmailMatchPolicy>('AUTO_INVITE')
  const [configured, setConfigured] = useState(false)
  const [webhookId, setWebhookId] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch('/api/super-admin/settings/eventbrite')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: EventbriteConfig | null) => {
        if (data) {
          setHasToken(data.hasToken)
          setPolicy(data.emailMatchPolicy)
          setConfigured(data.configured)
          setWebhookId(data.webhookId)
          setLastSyncAt(data.lastSyncAt)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, string> = { emailMatchPolicy: policy }
      if (tokenInput.trim()) body.privateToken = tokenInput.trim()

      const res = await fetch('/api/super-admin/settings/eventbrite', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data: EventbriteConfig = await res.json()
        setHasToken(data.hasToken)
        setConfigured(data.configured)
        setTokenInput('')
        showToast('Eventbrite settings saved.', 'success')
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to save Eventbrite settings.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const body: Record<string, string> = {}
      if (tokenInput.trim()) body.privateToken = tokenInput.trim()

      const res = await fetch('/api/super-admin/settings/eventbrite/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        setTestResult({ success: true, message: data.message || 'Connection successful!' })
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed.' })
      }
    } catch {
      setTestResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setTesting(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100'
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'
  const cardCls =
    'bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-5'
  const primaryBtnCls =
    'px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center gap-2'
  const secondaryBtnCls =
    'px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors flex items-center gap-2'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin mb-3" />
        <p className="text-sm">Loading Eventbrite settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-page-enter">
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
          )}
        >
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      <Link
        href="/super-admin/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Ticket className="h-6 w-6 text-orange-600" />
            Eventbrite Integration
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Pull external workshops onto the public catalogue and sync attendees as bookings happen.
          </p>
        </div>
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
            configured
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
          )}
        >
          {configured ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {configured ? 'Connected' : 'Not configured'}
        </span>
      </div>

      <div className={cardCls}>
        <div>
          <label className={labelCls}>Private Token</label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className={inputCls}
            placeholder={hasToken ? '••••••••  (leave blank to keep current token)' : 'Paste your Eventbrite Private Token'}
            autoComplete="off"
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Get this from{' '}
            <a
              href="https://www.eventbrite.com/account-settings/apps"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-orange-600 hover:underline dark:text-orange-400"
            >
              Eventbrite → Account Settings → Developer Links → API Keys
              <ExternalLink className="h-3 w-3" />
            </a>
            . The token gives the platform read access to your account&apos;s events,
            orders, and attendees. Stored securely; never shared with learners.
          </p>
        </div>

        {testResult && (
          <div
            className={clsx(
              'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium',
              testResult.success
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
            )}
          >
            {testResult.success ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 flex-shrink-0" />
            )}
            {testResult.message}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={testing || (!tokenInput.trim() && !hasToken)}
            className={secondaryBtnCls}
          >
            {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
            Test Connection
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (!tokenInput.trim() && !hasToken && policy === 'AUTO_INVITE')}
            className={primaryBtnCls}
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>

      <div className={cardCls}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Email matching policy
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            What happens when someone books a workshop on Eventbrite using an
            email that isn&apos;t on a platform account.
          </p>
        </div>

        <div className="space-y-2">
          {(Object.keys(POLICY_LABELS) as EmailMatchPolicy[]).map((value) => {
            const meta = POLICY_LABELS[value]
            const selected = policy === value
            return (
              <button
                type="button"
                key={value}
                onClick={() => setPolicy(value)}
                className={clsx(
                  'w-full text-left rounded-xl border-2 p-4 transition-all',
                  selected
                    ? 'border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/20'
                    : 'border-calm-200 hover:border-orange-300 dark:border-slate-600 dark:hover:border-orange-600',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={clsx(
                      'mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0',
                      selected
                        ? 'border-orange-500 bg-orange-500'
                        : 'border-slate-300 dark:border-slate-500',
                    )}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {meta.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {meta.help}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {configured && (
        <div className={cardCls}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Status
            </h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Webhook
              </dt>
              <dd className="mt-1 text-slate-700 dark:text-slate-200">
                {webhookId ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    Registered (id {webhookId})
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">
                    Will register on first workshop save
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Last sync
              </dt>
              <dd className="mt-1 text-slate-700 dark:text-slate-200">
                {lastSyncAt
                  ? new Date(lastSyncAt).toLocaleString('en-GB')
                  : <span className="text-slate-400 dark:text-slate-500">Never</span>}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}
