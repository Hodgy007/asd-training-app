'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Save, ExternalLink, Loader2 } from 'lucide-react'

export default function SuperAdminHomePage() {
  const [brief, setBrief] = useState('')
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/super-admin/home')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setHtml(data.htmlContent ?? '')
          setBrief(data.brief ?? '')
          setUpdatedAt(data.updatedAt ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function generate() {
    if (!brief.trim()) {
      showToast('Please add a brief first.', 'error')
      return
    }
    setGenerating(true)
    try {
      const res = await fetch('/api/super-admin/home/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? 'Generation failed.', 'error')
        return
      }
      setHtml(data.html ?? '')
      showToast('Generated. Review below and click Save to publish.', 'success')
    } catch {
      showToast('Generation failed.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/super-admin/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: html, brief }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? 'Save failed.', 'error')
        return
      }
      setHtml(data.htmlContent ?? '')
      setUpdatedAt(data.updatedAt ?? null)
      showToast('Home page saved.', 'success')
    } catch {
      showToast('Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Home Page</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Describe what you want on the Home page, generate it with AI, then save to publish.
            All authenticated users will see this page.
          </p>
          {updatedAt && (
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              Last saved: {new Date(updatedAt).toLocaleString('en-GB')}
            </p>
          )}
        </div>
        <Link
          href="/home"
          target="_blank"
          className="inline-flex items-center gap-1 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline flex-shrink-0"
        >
          View live <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      {toast && (
        <div
          className={
            toast.type === 'success'
              ? 'rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-3 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800'
              : 'rounded-xl bg-red-50 text-red-800 border border-red-200 px-4 py-3 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800'
          }
        >
          {toast.message}
        </div>
      )}

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <label htmlFor="brief" className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
          Brief
        </label>
        <textarea
          id="brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={5}
          placeholder={
            'e.g. A warm welcome page for practitioners and students. Include a hero, three feature cards (Training, Careers Advisor, Jobs), and a closing line thanking them for being part of the programme.'
          }
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={generate}
            disabled={generating || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <label htmlFor="html" className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
          HTML
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
          You can edit the generated HTML directly. It will be sanitised on save.
        </p>
        <textarea
          id="html"
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          rows={18}
          spellCheck={false}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">Preview</h2>
        {html ? (
          <div
            className="home-content"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nothing to preview yet. Generate some content above.
          </p>
        )}
      </section>
    </div>
  )
}
