'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Plug,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
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

interface ApiKeyRow {
  id: string
  name: string
  keyPrefix: string
  active: boolean
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdBy: string
}

interface NewKeyResponse {
  id: string
  name: string
  rawKey: string
  keyPrefix: string
  expiresAt: string | null
  createdAt: string
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

  // ── Integrations state ──────────────────────────────────────────────────
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyExpiry, setNewKeyExpiry] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [deleteKeyConfirm, setDeleteKeyConfirm] = useState<string | null>(null)

  const fetchApiKeys = useCallback(async () => {
    setLoadingKeys(true)
    try {
      const res = await fetch('/api/super-admin/integrations')
      if (res.ok) setApiKeys(await res.json())
    } finally {
      setLoadingKeys(false)
    }
  }, [])

  async function createApiKey() {
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    try {
      const res = await fetch('/api/super-admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim(), expiresAt: newKeyExpiry || null }),
      })
      if (res.ok) {
        const data: NewKeyResponse = await res.json()
        setNewKey(data)
        setNewKeyName('')
        setNewKeyExpiry('')
        setShowCreateKey(false)
        fetchApiKeys()
      }
    } finally {
      setCreatingKey(false)
    }
  }

  async function deleteApiKey(id: string) {
    await fetch('/api/super-admin/integrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleteKeyConfirm(null)
    fetchApiKeys()
  }

  function copyApiKey(key: string) {
    navigator.clipboard.writeText(key)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  // ── Fetch on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'authenticated') return

    fetchApiKeys()

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
  }, [status, fetchApiKeys])

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
  if (status === 'loading' || loadingMeeting || loadingSso || loadingKeys) {
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
    <div className="max-w-3xl mx-auto space-y-8">
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
          Configure platform-level meeting integration, single sign-on, and external integrations.
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

      {/* ── Integrations (API Keys) ───────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Plug className="h-5 w-5 text-emerald-600" />
            Integrations
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Connect external tools like Microsoft Power Automate or Dynamics 365 to your platform reports.
          </p>
        </div>

        {/* New key banner */}
        {newKey && (
          <div className="rounded-2xl border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">API Key Created — Copy Now</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  This key will only be shown once. Store it securely.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-4 py-3 border border-amber-300 dark:border-amber-600">
              <code className="flex-1 text-sm font-mono text-slate-800 dark:text-slate-200 break-all select-all">
                {newKey.rawKey}
              </code>
              <button
                onClick={() => copyApiKey(newKey.rawKey)}
                className="flex-shrink-0 p-2 rounded-lg hover:bg-calm-100 dark:hover:bg-slate-700 transition-colors"
                title="Copy to clipboard"
              >
                {keyCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-400" />}
              </button>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
            >
              I&apos;ve copied the key — dismiss this
            </button>
          </div>
        )}

        {/* API Keys card */}
        <div className={cardCls + ' !p-0 overflow-hidden'}>
          <div className="flex items-center justify-between px-4 py-4 border-b border-calm-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">API Keys</h3>
            </div>
            <button
              onClick={() => setShowCreateKey(!showCreateKey)}
              className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Key
            </button>
          </div>

          {/* Create form */}
          {showCreateKey && (
            <div className="px-4 py-4 bg-calm-50 dark:bg-slate-800/50 border-b border-calm-200 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Key Name *</label>
                  <input
                    className={inputCls}
                    type="text"
                    placeholder="e.g. Power Automate Production"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date (optional)</label>
                  <input
                    className={inputCls}
                    type="datetime-local"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={createApiKey}
                  disabled={!newKeyName.trim() || creatingKey}
                  className={primaryBtnCls}
                >
                  {creatingKey ? 'Creating...' : 'Generate Key'}
                </button>
                <button
                  onClick={() => setShowCreateKey(false)}
                  className={secondaryBtnCls}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Keys table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Key</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Last Used</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-xs">Expires</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 w-16 text-xs"></th>
                </tr>
              </thead>
              <tbody>
                {loadingKeys ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Loading...
                    </td>
                  </tr>
                ) : apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                      <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      No API keys yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((k) => (
                    <tr key={k.id} className="border-b border-calm-100 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{k.name}</span>
                        <p className="text-xs text-slate-400 dark:text-slate-500">by {k.createdBy}</p>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-slate-500 dark:text-slate-400">{k.keyPrefix}...</code>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {k.expiresAt ? (
                          <span className={clsx(
                            new Date(k.expiresAt) < new Date() ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'
                          )}>
                            {new Date(k.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {deleteKeyConfirm === k.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteApiKey(k.id)} className="text-xs text-red-600 font-semibold hover:underline">Yes</button>
                            <button onClick={() => setDeleteKeyConfirm(null)} className="text-xs text-slate-400 hover:underline">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteKeyConfirm(k.id)} className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors" title="Delete key">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Power Automate Guide */}
        <div className={cardCls}>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Connecting with Microsoft Power Automate</h3>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Use Power Automate to automatically sync training, survey, and document library reports into Microsoft Dynamics 365, SharePoint, Excel, or any other connected service.
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Step 1: Create an API Key</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Click <strong>Create Key</strong> above, give it a name (e.g. &quot;Power Automate&quot;), and copy the key. Store it securely — it cannot be retrieved again.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Step 2: Create a Power Automate Flow</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>Go to <strong>make.powerautomate.com</strong> and create a new <strong>Scheduled cloud flow</strong> (e.g. run daily or weekly).</li>
                <li>Add an <strong>HTTP</strong> action with these settings:</li>
              </ol>
              <div className="mt-2 bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-calm-200 dark:border-slate-600 space-y-2">
                <div className="flex items-start gap-3 text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 w-20 flex-shrink-0">Method:</span>
                  <code className="text-slate-800 dark:text-slate-200">GET</code>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 w-20 flex-shrink-0">URL:</span>
                  <code className="text-slate-800 dark:text-slate-200 break-all">{typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/reports</code>
                </div>
                <div className="flex items-start gap-3 text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 w-20 flex-shrink-0">Headers:</span>
                  <code className="text-slate-800 dark:text-slate-200">Authorization: Bearer YOUR_API_KEY</code>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Step 3: Filter by Section (optional)</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Add a <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">?section=</code> query parameter to fetch only the data you need:
              </p>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-calm-200 dark:border-slate-600 overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-calm-100 dark:border-slate-700">
                      <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">?section=training</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">Training completion by organisation and module</td>
                    </tr>
                    <tr className="border-b border-calm-100 dark:border-slate-700">
                      <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">?section=surveys</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">Survey responses with individual answers</td>
                    </tr>
                    <tr className="border-b border-calm-100 dark:border-slate-700">
                      <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">?section=library</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">Document downloads by collection and document</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">(no parameter)</td>
                      <td className="px-3 py-2 text-slate-500 dark:text-slate-400">All sections combined</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Step 4: Send Data to Dynamics 365</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>After the HTTP action, add a <strong>Parse JSON</strong> action using the HTTP response body.</li>
                <li>Use an <strong>Apply to each</strong> loop to iterate over the training/survey/library arrays.</li>
                <li>Add a <strong>Dataverse — Add a new row</strong> action to create records in your Dynamics 365 entity.</li>
                <li>Map JSON fields (e.g. <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">organisationName</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">completionRate</code>) to Dynamics columns.</li>
              </ol>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Alternative: Export to Excel / SharePoint</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Instead of Dynamics, you can use the <strong>Excel Online — Add a row</strong> or <strong>SharePoint — Create item</strong> actions to send data to a spreadsheet or SharePoint list that your team already uses.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Tip:</strong> Start with a weekly schedule and the <code className="bg-amber-100 dark:bg-amber-800/50 px-1 py-0.5 rounded text-xs">?section=training</code> filter to test the connection before building the full integration.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
