'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
  Save,
  Loader2,
} from 'lucide-react'
import { clsx } from 'clsx'

interface SsoConfig {
  displayName: string | null
  metadataUrl: string | null
  entityId: string | null
  ssoUrl: string | null
  certificate: string | null
  enforceForCharityUsers: boolean
  configured: boolean
}

export default function SsoSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [metadataUrl, setMetadataUrl] = useState('')
  const [entityId, setEntityId] = useState('')
  const [ssoUrl, setSsoUrl] = useState('')
  const [certificate, setCertificate] = useState('')
  const [enforceForCharityUsers, setEnforceForCharityUsers] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parsingMetadata, setParsingMetadata] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch('/api/super-admin/settings/sso')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SsoConfig | null) => {
        if (data) {
          setDisplayName(data.displayName ?? '')
          setMetadataUrl(data.metadataUrl ?? '')
          setEntityId(data.entityId ?? '')
          setSsoUrl(data.ssoUrl ?? '')
          setCertificate(data.certificate ?? '')
          setEnforceForCharityUsers(data.enforceForCharityUsers ?? false)
          setConfigured(data.configured)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleParseMetadata() {
    if (!metadataUrl.trim()) {
      showToast('Enter a metadata URL first.', 'error')
      return
    }
    setParsingMetadata(true)
    try {
      const res = await fetch('/api/super-admin/settings/sso/parse-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadataUrl: metadataUrl.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setEntityId(data.entityId ?? '')
        setSsoUrl(data.ssoUrl ?? '')
        setCertificate(data.certificate ?? '')
        showToast('Metadata parsed. Fields populated.', 'success')
      } else {
        showToast(data.error || 'Failed to parse metadata.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setParsingMetadata(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/super-admin/settings/sso', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          metadataUrl: metadataUrl.trim() || null,
          entityId: entityId.trim() || null,
          ssoUrl: ssoUrl.trim() || null,
          certificate: certificate.trim() || null,
          enforceForCharityUsers,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setConfigured(data.configured)
        showToast('SSO configuration saved.', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to save SSO configuration.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/super-admin/settings/sso/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: entityId.trim(),
          ssoUrl: ssoUrl.trim(),
          certificate: certificate.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setTestResult({ success: true, message: 'SSO configuration is valid.' })
      } else {
        setTestResult({ success: false, message: data.error || 'SSO validation failed.' })
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
        <p className="text-sm">Loading SSO settings...</p>
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
            <Shield className="h-6 w-6 text-emerald-600" />
            SSO Configuration
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure SAML-based single sign-on for charity users.
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
          {configured ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {configured ? 'Configured' : 'Not configured'}
        </span>
      </div>

      <div className={cardCls}>
        <div>
          <label className={labelCls}>Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputCls}
            placeholder="e.g. Charity SSO"
          />
          <p className="text-xs text-slate-400 mt-1">
            Shown to users on the sign-in page when SSO is enforced.
          </p>
        </div>

        <div>
          <label className={labelCls}>Metadata URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={metadataUrl}
              onChange={(e) => setMetadataUrl(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
              placeholder="https://idp.example.com/metadata"
            />
            <button
              type="button"
              onClick={handleParseMetadata}
              disabled={parsingMetadata || !metadataUrl.trim()}
              className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {parsingMetadata ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Auto-configure
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Paste your IdP metadata URL to auto-populate Entity ID, SSO URL, and Certificate.
          </p>
        </div>

        <div>
          <label className={labelCls}>Entity ID</label>
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className={inputCls}
            placeholder="https://idp.example.com/entity"
          />
        </div>

        <div>
          <label className={labelCls}>SSO URL</label>
          <input
            type="url"
            value={ssoUrl}
            onChange={(e) => setSsoUrl(e.target.value)}
            className={inputCls}
            placeholder="https://idp.example.com/sso/saml"
          />
        </div>

        <div>
          <label className={labelCls}>Certificate</label>
          <textarea
            value={certificate}
            onChange={(e) => setCertificate(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 font-mono"
            placeholder="MIIC..."
          />
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Enforce SSO for charity users
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Require charity users to sign in via SSO instead of email and password.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enforceForCharityUsers}
            onClick={() => setEnforceForCharityUsers(!enforceForCharityUsers)}
            className={clsx(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300',
              enforceForCharityUsers ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
            )}
          >
            <span
              className={clsx(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                enforceForCharityUsers ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
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
            disabled={testing || !ssoUrl.trim() || !entityId.trim() || !certificate.trim()}
            className={secondaryBtnCls}
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
            Test SSO
          </button>
          <button onClick={handleSave} disabled={saving} className={primaryBtnCls}>
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
