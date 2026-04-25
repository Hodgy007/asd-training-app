'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Sparkles, Save, ExternalLink, Loader2, Code2, Wand2 } from 'lucide-react'

const EXAMPLE_BRIEF =
  'A warm welcome page for practitioners and students. Include a hero, three feature cards (Training, Careers Advisor, Jobs), and a closing line thanking them for being part of the programme.'

export default function SuperAdminHomePage() {
  const [brief, setBrief] = useState('')
  const [instruction, setInstruction] = useState('')
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [modifying, setModifying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

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

  // Sync the editable preview's innerHTML when `html` changes from outside
  // (generate, modify, code-view edit, initial load) — but never while the
  // user has focus there, otherwise we'd clobber their cursor.
  useEffect(() => {
    if (previewRef.current && document.activeElement !== previewRef.current) {
      previewRef.current.innerHTML = html
    }
  }, [html])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  function commitPreviewEdit() {
    if (previewRef.current) {
      const next = previewRef.current.innerHTML
      if (next !== html) setHtml(next)
    }
  }

  async function generate() {
    const usingExample = !brief.trim()
    const briefToSend = usingExample ? EXAMPLE_BRIEF : brief
    setGenerating(true)
    try {
      const res = await fetch('/api/super-admin/home/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: briefToSend }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? 'Generation failed.', 'error')
        return
      }
      setHtml(data.html ?? '')
      if (usingExample) setBrief(EXAMPLE_BRIEF)
      showToast(
        usingExample
          ? 'Generated from the example brief. Edit it above to regenerate, or tweak inline below.'
          : 'Generated. Edit inline below or save to publish.',
        'success',
      )
    } catch {
      showToast('Generation failed.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  async function modify() {
    if (!instruction.trim()) {
      showToast('Please describe the change you want.', 'error')
      return
    }
    if (!html.trim()) {
      showToast('Generate a layout first, then ask for changes.', 'error')
      return
    }
    // Make sure any in-progress inline edit is captured before we send.
    commitPreviewEdit()
    setModifying(true)
    try {
      const res = await fetch('/api/super-admin/home/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction, currentHtml: previewRef.current?.innerHTML ?? html }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? 'Update failed.', 'error')
        return
      }
      setHtml(data.html ?? '')
      setInstruction('')
      showToast('Layout updated. Review below and save to publish.', 'success')
    } catch {
      showToast('Update failed.', 'error')
    } finally {
      setModifying(false)
    }
  }

  async function save() {
    commitPreviewEdit()
    const toSave = previewRef.current?.innerHTML ?? html
    setSaving(true)
    try {
      const res = await fetch('/api/super-admin/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: toSave, brief }),
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
            Describe what you want, generate it with AI, then edit inline. All authenticated users
            will see this page.
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

      {/* 1. Generate from a brief */}
      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <label htmlFor="brief" className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
          Brief
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
          Generating replaces the whole page. Leave this empty and click <em>Generate with AI</em>
          {' '}to use the example below as the brief. Use the <em>Modify</em> box further down for
          smaller targeted changes.
        </p>
        <textarea
          id="brief"
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={5}
          placeholder={`e.g. ${EXAMPLE_BRIEF}`}
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

      {/* 2. Editable preview (primary edit surface) */}
      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Editable preview</h2>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            Click any text below to edit. Changes save when you click <strong>Save</strong>.
          </p>
        </div>

        {/* Locked logo header — matches the live page */}
        <div className="px-6 pt-6">
          <div className="flex items-center gap-3 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-12 w-auto" />
          </div>
        </div>

        {html ? (
          <div
            ref={previewRef}
            contentEditable={!loading && !generating && !modifying && !saving}
            suppressContentEditableWarning
            onBlur={commitPreviewEdit}
            className="home-content px-6 pb-6 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 rounded-b-2xl"
          />
        ) : (
          <p className="px-6 pb-6 text-sm text-slate-500 dark:text-slate-400">
            Nothing to preview yet. Generate some content above.
          </p>
        )}

        <div className="flex justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
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

      {/* 3. AI: modify the existing layout */}
      <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />
          <label htmlFor="instruction" className="block text-sm font-bold text-slate-900 dark:text-slate-100">
            Modify the existing layout
          </label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
          Describe a small change. The AI keeps the rest of the page intact.
        </p>
        <textarea
          id="instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={3}
          placeholder="e.g. Change the hero heading to 'Welcome to the Ambitious about Autism platform' and make the third card teal."
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={modify}
            disabled={modifying || loading || !html}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 disabled:opacity-50"
          >
            {modifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {modifying ? 'Updating…' : 'Apply changes'}
          </button>
        </div>
      </section>

      {/* 4. Optional: raw HTML / code view */}
      <details className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100 select-none flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          View / edit raw HTML
        </summary>
        <div className="px-6 pb-6">
          <p className="text-xs text-slate-500 dark:text-slate-500 mb-2">
            Editing here updates the preview. HTML is sanitised on save.
          </p>
          <textarea
            id="html"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={18}
            spellCheck={false}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </details>
    </div>
  )
}
