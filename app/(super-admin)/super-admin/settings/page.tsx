'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Video,
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
  Save,
  Wifi,
  WifiOff,
  Loader2,
  Settings,
} from 'lucide-react'
import { clsx } from 'clsx'

type MeetingPlatform = 'ZOOM' | 'TEAMS'

interface MeetingConfig {
  platform: MeetingPlatform
  apiKey: string | null
  apiSecret: string | null
  tenantId: string | null
  configured: boolean
}

interface SsoConfig {
  displayName: string | null
  metadataUrl: string | null
  entityId: string | null
  ssoUrl: string | null
  certificate: string | null
  enforceForCharityUsers: boolean
  configured: boolean
}

export default function CharitySettingsPage() {
  const { data: session, status } = useSession()

  // ── Loading state ────────────────────────────────────────────────────────
  const [loadingMeeting, setLoadingMeeting] = useState(true)
  const [loadingSso, setLoadingSso] = useState(true)

  // ── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Meeting config state ─────────────────────────────────────────────────
  const [platform, setPlatform] = useState<MeetingPlatform>('ZOOM')
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [meetingConfigured, setMeetingConfigured] = useState(false)
  const [savingMeeting, setSavingMeeting] = useState(false)
  const [testingMeeting, setTestingMeeting] = useState(false)
  const [meetingTestResult, setMeetingTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // ── SSO config state ─────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState('')
  const [metadataUrl, setMetadataUrl] = useState('')
  const [entityId, setEntityId] = useState('')
  const [ssoUrl, setSsoUrl] = useState('')
  const [certificate, setCertificate] = useState('')
  const [enforceForCharityUsers, setEnforceForCharityUsers] = useState(false)
  const [ssoConfigured, setSsoConfigured] = useState(false)
  const [savingSso, setSavingSso] = useState(false)
  const [parsingMetadata, setParsingMetadata] = useState(false)
  const [testingSso, setTestingSso] = useState(false)
  const [ssoTestResult, setSsoTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // ── Fetch on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated') return

    fetch('/api/super-admin/settings/meetings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: MeetingConfig | null) => {
        if (data) {
          setPlatform(data.platform ?? 'ZOOM')
          setApiKey(data.apiKey ?? '')
          if (data.platform === 'ZOOM' && data.apiSecret?.includes('|')) {
            const [cid, csec] = data.apiSecret.split('|')
            setApiSecret(cid ?? '')
            setTenantId(csec ?? '')
          } else {
            setApiSecret(data.apiSecret ?? '')
            setTenantId(data.tenantId ?? '')
          }
          setMeetingConfigured(data.configured)
        }
      })
      .finally(() => setLoadingMeeting(false))

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
          setSsoConfigured(data.configured)
        }
      })
      .finally(() => setLoadingSso(false))
  }, [status])

  // ── Meeting handlers ─────────────────────────────────────────────────────
  async function handleSaveMeeting() {
    setSavingMeeting(true)
    try {
      const body: Record<string, string> = { platform, apiKey }
      if (platform === 'ZOOM') {
        body.apiSecret = `${apiSecret}|${tenantId}`
      } else {
        body.apiSecret = apiSecret
        if (tenantId) body.tenantId = tenantId
      }

      const res = await fetch('/api/super-admin/settings/meetings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setMeetingConfigured(true)
        showToast('Meeting settings saved.', 'success')
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to save meeting settings.', 'error')
      }
    } finally {
      setSavingMeeting(false)
    }
  }

  async function handleTestMeeting() {
    setTestingMeeting(true)
    setMeetingTestResult(null)
    try {
      const body: Record<string, string> = { platform, apiKey }
      if (platform === 'ZOOM') {
        body.apiSecret = `${apiSecret}|${tenantId}`
      } else {
        body.apiSecret = apiSecret
        if (tenantId) body.tenantId = tenantId
      }

      const res = await fetch('/api/super-admin/settings/meetings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setMeetingTestResult({ success: true, message: data.message || 'Connection successful!' })
      } else {
        setMeetingTestResult({ success: false, message: data.error || data.message || 'Connection failed.' })
      }
    } catch {
      setMeetingTestResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setTestingMeeting(false)
    }
  }

  // ── SSO handlers ─────────────────────────────────────────────────────────
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

  async function handleSaveSso() {
    setSavingSso(true)
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
        setSsoConfigured(data.configured)
        showToast('SSO configuration saved.', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to save SSO configuration.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setSavingSso(false)
    }
  }

  async function handleTestSso() {
    setTestingSso(true)
    setSsoTestResult(null)
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
        setSsoTestResult({ success: true, message: 'SSO configuration is valid.' })
      } else {
        setSsoTestResult({ success: false, message: data.error || 'SSO validation failed.' })
      }
    } catch {
      setSsoTestResult({ success: false, message: 'Network error. Please try again.' })
    } finally {
      setTestingSso(false)
    }
  }

  // ── Auth guard ───────────────────────────────────────────────────────────
  if (status === 'loading' || loadingMeeting || loadingSso) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin mb-3" />
        <p className="text-sm">Loading settings...</p>
      </div>
    )
  }

  if (session?.user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <XCircle className="h-8 w-8 mb-3 text-red-400" />
        <p className="text-sm font-medium">Access denied. Super Admin only.</p>
      </div>
    )
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

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-purple-500" />
          Charity Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Configure platform-level meeting integration and single sign-on for charity users.
        </p>
      </div>

      {/* ── Meeting Configuration ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Video className="h-5 w-5 text-emerald-600" />
              Meeting Configuration
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configure your video conferencing platform for automatic meeting creation.
            </p>
          </div>
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
              meetingConfigured
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
            )}
          >
            {meetingConfigured ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {meetingConfigured ? 'Connected' : 'Not configured'}
          </span>
        </div>

        <div className={cardCls}>
          {/* Platform selector */}
          <div>
            <label className={labelCls}>Platform</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPlatform('ZOOM')
                  setMeetingTestResult(null)
                }}
                className={clsx(
                  'flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-center',
                  platform === 'ZOOM'
                    ? 'border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-calm-200 text-slate-500 hover:border-blue-300 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-600',
                )}
              >
                Zoom
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlatform('TEAMS')
                  setMeetingTestResult(null)
                }}
                className={clsx(
                  'flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-center',
                  platform === 'TEAMS'
                    ? 'border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'border-calm-200 text-slate-500 hover:border-purple-300 dark:border-slate-600 dark:text-slate-400 dark:hover:border-purple-600',
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
                <label className={labelCls}>Account ID</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={inputCls}
                  placeholder="Your Zoom Account ID"
                />
              </div>
              <div>
                <label className={labelCls}>Client ID</label>
                <input
                  type="text"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className={inputCls}
                  placeholder="Your Zoom Client ID"
                />
              </div>
              <div>
                <label className={labelCls}>Client Secret</label>
                <input
                  type="password"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className={inputCls}
                  placeholder="Your Zoom Client Secret"
                />
              </div>
            </>
          )}

          {/* Teams fields */}
          {platform === 'TEAMS' && (
            <>
              <div>
                <label className={labelCls}>Client ID</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={inputCls}
                  placeholder="Azure AD Application Client ID"
                />
              </div>
              <div>
                <label className={labelCls}>Client Secret</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className={inputCls}
                  placeholder="Azure AD Client Secret"
                />
              </div>
              <div>
                <label className={labelCls}>Tenant ID</label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className={inputCls}
                  placeholder="Azure AD Tenant ID"
                />
              </div>
            </>
          )}

          {/* Test result */}
          {meetingTestResult && (
            <div
              className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium',
                meetingTestResult.success
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
              )}
            >
              {meetingTestResult.success ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {meetingTestResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestMeeting}
              disabled={testingMeeting || !apiKey.trim() || !apiSecret.trim()}
              className={secondaryBtnCls}
            >
              {testingMeeting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wifi className="h-3.5 w-3.5" />
              )}
              Test Connection
            </button>
            <button
              onClick={handleSaveMeeting}
              disabled={savingMeeting || !apiKey.trim() || !apiSecret.trim()}
              className={primaryBtnCls}
            >
              {savingMeeting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      </section>

      {/* ── SSO Configuration ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              SSO Configuration
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configure SAML-based single sign-on for charity users.
            </p>
          </div>
          <span
            className={clsx(
              'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
              ssoConfigured
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
            )}
          >
            {ssoConfigured ? (
              <CheckCircle className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {ssoConfigured ? 'Configured' : 'Not configured'}
          </span>
        </div>

        <div className={cardCls}>
          {/* Display Name */}
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

          {/* Metadata URL + Auto-configure */}
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

          {/* Entity ID */}
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

          {/* SSO URL */}
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

          {/* Certificate */}
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

          {/* Enforce SSO toggle */}
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

          {/* SSO test result */}
          {ssoTestResult && (
            <div
              className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium',
                ssoTestResult.success
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
              )}
            >
              {ssoTestResult.success ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {ssoTestResult.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestSso}
              disabled={testingSso || !ssoUrl.trim() || !entityId.trim() || !certificate.trim()}
              className={secondaryBtnCls}
            >
              {testingSso ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Shield className="h-3.5 w-3.5" />
              )}
              Test SSO
            </button>
            <button
              onClick={handleSaveSso}
              disabled={savingSso}
              className={primaryBtnCls}
            >
              {savingSso ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
