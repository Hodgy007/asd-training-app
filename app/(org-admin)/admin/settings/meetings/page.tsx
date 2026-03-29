'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Video,
  RefreshCw,
  CheckCircle,
  XCircle,
  Save,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { clsx } from 'clsx'

type MeetingPlatform = 'ZOOM' | 'TEAMS'

interface MeetingSettings {
  platform: MeetingPlatform
  apiKey: string
  apiSecret: string
  tenantId?: string
  configured: boolean
}

export default function MeetingSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [platform, setPlatform] = useState<MeetingPlatform>('ZOOM')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [configured, setConfigured] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'ORG_ADMIN') router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    fetch('/api/admin/settings/meetings')
      .then((r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((data: MeetingSettings | null) => {
        if (data) {
          setPlatform(data.platform)
          setApiKey(data.apiKey ?? '')
          setApiSecret(data.apiSecret ?? '')
          setTenantId(data.tenantId ?? '')
          setConfigured(data.configured)
        }
      })
      .finally(() => setLoading(false))
  }, [status])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body: Record<string, string> = { platform, apiKey, apiSecret }
      if (platform === 'TEAMS' && tenantId) body.tenantId = tenantId

      const res = await fetch('/api/admin/settings/meetings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        showToast('Meeting settings saved.', 'success')
        setConfigured(true)
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to save settings.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const body: Record<string, string> = { platform, apiKey, apiSecret }
      if (platform === 'TEAMS' && tenantId) body.tenantId = tenantId

      const res = await fetch('/api/admin/settings/meetings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message || 'Connection successful!' })
      } else {
        setTestResult({ success: false, message: data.error || data.message || 'Connection failed.' })
      }
    } catch {
      setTestResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setTesting(false)
    }
  }

  if (status !== 'authenticated' || session?.user?.role !== 'ORG_ADMIN') return null

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin mb-3" />
        <p className="text-sm">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Breadcrumb */}
      <Link
        href="/admin/sessions"
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sessions
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Video className="h-6 w-6 text-emerald-600" />
            Meeting Integration
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure your video conferencing platform for automatic meeting creation.
          </p>
        </div>
        <span className={clsx(
          'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
          configured
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        )}>
          {configured ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {configured ? 'Connected' : 'Not configured'}
        </span>
      </div>

      {/* Settings Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
        {/* Platform selector */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Platform</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setPlatform('ZOOM'); setTestResult(null) }}
              className={clsx(
                'flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-center',
                platform === 'ZOOM'
                  ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-calm-200 text-slate-500 hover:border-blue-300 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-600'
              )}
            >
              Zoom
            </button>
            <button
              type="button"
              onClick={() => { setPlatform('TEAMS'); setTestResult(null) }}
              className={clsx(
                'flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-center',
                platform === 'TEAMS'
                  ? 'border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'border-calm-200 text-slate-500 hover:border-purple-300 dark:border-slate-600 dark:text-slate-400 dark:hover:border-purple-600'
              )}
            >
              Microsoft Teams
            </button>
          </div>
        </div>

        {/* Zoom fields */}
        {platform === 'ZOOM' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Account ID</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                placeholder="Your Zoom Account ID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Client ID</label>
              <input
                type="text"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                placeholder="Your Zoom Client ID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Client Secret</label>
              <input
                type="password"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                placeholder="Your Zoom Client Secret"
              />
            </div>
          </>
        )}

        {/* Teams fields */}
        {platform === 'TEAMS' && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Client ID</label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                placeholder="Azure AD Application Client ID"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Client Secret</label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                placeholder="Azure AD Client Secret"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tenant ID</label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
                placeholder="Azure AD Tenant ID"
              />
            </div>
          </>
        )}

        {/* Test result */}
        {testResult && (
          <div className={clsx(
            'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium',
            testResult.success
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
          )}>
            {testResult.success ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
            {testResult.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={testing || !apiKey.trim() || !apiSecret.trim()}
            className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
            Test Connection
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !apiKey.trim() || !apiSecret.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center gap-2"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
