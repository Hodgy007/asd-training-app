'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Shield,
  RefreshCw,
  CheckCircle,
  XCircle,
  Save,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { clsx } from 'clsx'

interface SsoConfig {
  id: string
  emailDomain: string
  metadataUrl: string | null
  ssoUrl: string
  entityId: string
  certificate: string
  autoProvision: boolean
  defaultRole: string | null
  configured: boolean
}

export default function SsoSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [testingSSO, setTestingSSO] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [configExists, setConfigExists] = useState(false)
  const [emailDomain, setEmailDomain] = useState('')
  const [metadataUrl, setMetadataUrl] = useState('')
  const [ssoUrl, setSsoUrl] = useState('')
  const [entityId, setEntityId] = useState('')
  const [certificate, setCertificate] = useState('')
  const [autoProvision, setAutoProvision] = useState(false)
  const [defaultRole, setDefaultRole] = useState('')
  const [configured, setConfigured] = useState(false)

  const [allowedRoles, setAllowedRoles] = useState<string[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session?.user?.role !== 'ORG_ADMIN') router.push('/dashboard')
  }, [status, session, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    Promise.all([
      fetch('/api/admin/settings/sso').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/sessions/org-info').then((r) => (r.ok ? r.json() : null)),
    ]).then(([ssoData, orgData]: [SsoConfig | null, { allowedRoles?: string[]; name?: string } | null]) => {
      if (ssoData) {
        setConfigExists(true)
        setEmailDomain(ssoData.emailDomain ?? '')
        setMetadataUrl(ssoData.metadataUrl ?? '')
        setSsoUrl(ssoData.ssoUrl ?? '')
        setEntityId(ssoData.entityId ?? '')
        setCertificate(ssoData.certificate ?? '')
        setAutoProvision(ssoData.autoProvision ?? false)
        setDefaultRole(ssoData.defaultRole ?? '')
        setConfigured(ssoData.configured)
      }
      if (orgData?.allowedRoles) {
        setAllowedRoles(orgData.allowedRoles)
      }
    }).finally(() => setLoading(false))
  }, [status])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleParseMetadata() {
    if (!metadataUrl.trim()) {
      showToast('Enter a metadata URL first.', 'error')
      return
    }
    setParsing(true)
    try {
      const res = await fetch('/api/admin/settings/sso/parse-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadataUrl: metadataUrl.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSsoUrl(data.ssoUrl ?? '')
        setEntityId(data.entityId ?? '')
        setCertificate(data.certificate ?? '')
        showToast('Metadata parsed successfully. Fields populated.', 'success')
      } else {
        showToast(data.error || 'Failed to parse metadata.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setParsing(false)
    }
  }

  async function handleSave() {
    if (!emailDomain.trim()) {
      showToast('Email domain is required.', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings/sso', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailDomain: emailDomain.trim(),
          metadataUrl: metadataUrl.trim() || null,
          ssoUrl: ssoUrl.trim(),
          entityId: entityId.trim(),
          certificate: certificate.trim(),
          autoProvision,
          defaultRole: defaultRole || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setConfigExists(true)
        setConfigured(data.configured)
        showToast('SSO configuration saved.', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to save configuration.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTestSSO() {
    setTestingSSO(true)
    try {
      const res = await fetch('/api/admin/settings/sso/test', {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok && data.loginUrl) {
        window.open(data.loginUrl, '_blank')
        showToast('Test login opened in new tab.', 'success')
      } else {
        showToast(data.error || 'Failed to generate test URL.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setTestingSSO(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Remove Enterprise SSO configuration? Users will no longer be able to sign in via SAML SSO.')) {
      return
    }
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/settings/sso', { method: 'DELETE' })
      if (res.ok) {
        setConfigExists(false)
        setEmailDomain('')
        setMetadataUrl('')
        setSsoUrl('')
        setEntityId('')
        setCertificate('')
        setAutoProvision(false)
        setDefaultRole('')
        setConfigured(false)
        showToast('SSO configuration removed.', 'success')
      } else {
        showToast('Failed to remove configuration.', 'error')
      }
    } catch {
      showToast('Network error.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (status !== 'authenticated' || session?.user?.role !== 'ORG_ADMIN') return null

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin mb-3" />
        <p className="text-sm">Loading SSO settings...</p>
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
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="h-6 w-6 text-emerald-600" />
            Enterprise SSO (SAML)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Configure SAML-based single sign-on for your organisation.
          </p>
        </div>
        <span className={clsx(
          'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full',
          configured
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
        )}>
          {configured ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {configured ? 'Configured' : 'Not configured'}
        </span>
      </div>

      {/* Email Domain */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email Domain</label>
          <input
            type="text"
            value={emailDomain}
            onChange={(e) => setEmailDomain(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
            placeholder="example.com"
          />
          <p className="text-xs text-slate-400 mt-1">Users with this email domain will be redirected to your IdP.</p>
        </div>
      </div>

      {/* IdP Metadata */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">IdP Metadata URL</label>
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
              disabled={parsing || !metadataUrl.trim()}
              className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Auto-configure
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">Paste your IdP metadata URL to auto-populate the fields below.</p>
        </div>

        {/* SSO URL */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">SSO URL</label>
          <input
            type="url"
            value={ssoUrl}
            onChange={(e) => setSsoUrl(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
            placeholder="https://idp.example.com/sso/saml"
          />
        </div>

        {/* Entity ID */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Entity ID</label>
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
            placeholder="https://idp.example.com/entity"
          />
        </div>

        {/* Certificate */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Certificate</label>
          <textarea
            value={certificate}
            onChange={(e) => setCertificate(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100 font-mono"
            placeholder="MIIC..."
          />
        </div>
      </div>

      {/* Auto-provision */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Auto-provision users</p>
            <p className="text-xs text-slate-400 mt-0.5">Automatically create accounts for new users from your identity provider.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoProvision}
            onClick={() => setAutoProvision(!autoProvision)}
            className={clsx(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300',
              autoProvision ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            )}
          >
            <span
              className={clsx(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                autoProvision ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {autoProvision && (
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Default role for new users</label>
            <select
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="">Select a role...</option>
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTestSSO}
            disabled={testingSSO || !ssoUrl.trim() || !emailDomain.trim()}
            className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {testingSSO ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
            Test SSO
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !emailDomain.trim()}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      {configExists && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/40 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Removing SSO will disable SAML-based login for all users in your organisation.
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Remove Enterprise SSO
          </button>
        </div>
      )}
    </div>
  )
}
