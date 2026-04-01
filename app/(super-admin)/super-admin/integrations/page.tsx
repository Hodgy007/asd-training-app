'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plug,
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { clsx } from 'clsx'

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

export default function IntegrationsPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newExpiry, setNewExpiry] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<NewKeyResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/integrations')
      if (res.ok) setKeys(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function createKey() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/super-admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          expiresAt: newExpiry || null,
        }),
      })
      if (res.ok) {
        const data: NewKeyResponse = await res.json()
        setNewKey(data)
        setNewName('')
        setNewExpiry('')
        setShowCreate(false)
        fetchKeys()
      }
    } finally {
      setCreating(false)
    }
  }

  async function deleteKey(id: string) {
    await fetch('/api/super-admin/integrations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleteConfirm(null)
    fetchKeys()
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Plug className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          Integrations
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Connect external tools like Microsoft Power Automate or Dynamics 365 to your platform reports.
        </p>
      </div>

      {/* New key banner */}
      {newKey && (
        <div className="card border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-3">
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
              onClick={() => copyKey(newKey.rawKey)}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-calm-100 dark:hover:bg-slate-700 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-slate-400" />}
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

      {/* API Keys section */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4 border-b border-calm-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <h2 className="font-semibold text-slate-900 dark:text-white">API Keys</h2>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Key
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="px-4 py-4 bg-calm-50 dark:bg-slate-800/50 border-b border-calm-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Key Name *</label>
                <input
                  className="input w-full"
                  type="text"
                  placeholder="e.g. Power Automate Production"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Expiry Date (optional)</label>
                <input
                  className="input w-full"
                  type="datetime-local"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value ? new Date(e.target.value).toISOString() : '')}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={createKey}
                disabled={!newName.trim() || creating}
                className="btn btn-primary text-sm"
              >
                {creating ? 'Creating...' : 'Generate Key'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="btn btn-secondary text-sm"
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
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Key</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Last Used</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Expires</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No API keys yet. Create one to get started.
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k.id} className="border-b border-calm-100 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{k.name}</span>
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
                      {deleteConfirm === k.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteKey(k.id)} className="text-xs text-red-600 font-semibold hover:underline">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-xs text-slate-400 hover:underline">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(k.id)} className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors" title="Delete key">
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
      <div className="card space-y-5">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Connecting with Microsoft Power Automate</h2>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Use Power Automate to automatically sync training, survey, and document library reports into Microsoft Dynamics 365, SharePoint, Excel, or any other connected service.
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Step 1: Create an API Key</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Click <strong>Create Key</strong> above, give it a name (e.g. &quot;Power Automate&quot;), and copy the key. Store it securely — it cannot be retrieved again.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Step 2: Create a Power Automate Flow</h3>
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
                <code className="text-slate-800 dark:text-slate-200 break-all">{baseUrl}/api/integrations/reports</code>
              </div>
              <div className="flex items-start gap-3 text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 w-20 flex-shrink-0">Headers:</span>
                <code className="text-slate-800 dark:text-slate-200">Authorization: Bearer YOUR_API_KEY</code>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Step 3: Filter by Section (optional)</h3>
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
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Step 4: Send Data to Dynamics 365</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>After the HTTP action, add a <strong>Parse JSON</strong> action using the HTTP response body.</li>
              <li>Use an <strong>Apply to each</strong> loop to iterate over the training/survey/library arrays.</li>
              <li>Add a <strong>Dataverse — Add a new row</strong> action to create records in your Dynamics 365 entity.</li>
              <li>Map JSON fields (e.g. <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">organisationName</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">completionRate</code>) to Dynamics columns.</li>
            </ol>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">Alternative: Export to Excel / SharePoint</h3>
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
    </div>
  )
}
