'use client'

import { useState, useEffect, useRef, ChangeEvent } from 'react'
import Link from 'next/link'
import {
  Sparkles, Save, ExternalLink, Loader2, Code2, Wand2,
  ImagePlus, Film, Youtube, BookmarkCheck, RotateCcw, Undo2,
} from 'lucide-react'
import { HowToPanel } from '@/components/howto/panel'
import HomePageBuilderHowTo from '@/components/howto/super-admin/home'

/** Convert a YouTube/Vimeo watch URL to an embed URL. Returns null on miss. */
function toEmbedUrl(raw: string): string | null {
  const url = raw.trim()
  if (!url) return null
  // YouTube — youtu.be/ID, youtube.com/watch?v=ID, youtube.com/shorts/ID
  const ytShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/)
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`
  const ytWatch = url.match(/youtube\.com\/(?:watch\?v=|shorts\/)([a-zA-Z0-9_-]{6,})/)
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`
  // Already an embed
  if (/youtube\.com\/embed\//.test(url)) return url
  // Vimeo — vimeo.com/ID or player.vimeo.com/video/ID
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  if (/player\.vimeo\.com\/video\//.test(url)) return url
  return null
}

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
  const [uploading, setUploading] = useState<null | 'image' | 'video'>(null)
  const [hasDefault, setHasDefault] = useState(false)
  const [defaultSetAt, setDefaultSetAt] = useState<string | null>(null)
  const [settingDefault, setSettingDefault] = useState(false)
  const [resetting, setResetting] = useState(false)
  // Single-level undo for AI actions. We capture the HTML *immediately before*
  // a generate/modify call so the editor can roll back if the result isn't an
  // improvement. Cleared once consumed; not persisted across reloads.
  const [previousHtml, setPreviousHtml] = useState<string | null>(null)
  const [previousAction, setPreviousAction] = useState<'generate' | 'modify' | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/super-admin/home')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setHtml(data.htmlContent ?? '')
          setBrief(data.brief ?? '')
          setUpdatedAt(data.updatedAt ?? null)
          setHasDefault(!!data.hasDefault)
          setDefaultSetAt(data.defaultSetAt ?? null)
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

  /** Append a sanitised HTML snippet to the end of the preview. */
  function appendToPreview(snippet: string) {
    // Make sure any in-progress inline edit is captured first.
    const current = previewRef.current?.innerHTML ?? html
    setHtml(`${current}${snippet}`)
  }

  async function uploadFile(file: File, kind: 'image' | 'video'): Promise<string | null> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', kind)
    const res = await fetch('/api/super-admin/home/upload', { method: 'POST', body: formData })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.url) {
      showToast(data?.error ?? 'Upload failed.', 'error')
      return null
    }
    return data.url as string
  }

  async function onImagePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading('image')
    try {
      const url = await uploadFile(file, 'image')
      if (!url) return
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
      appendToPreview(
        `<p><img src="${url}" alt="${alt}" class="w-full h-auto rounded-xl my-4" /></p>`,
      )
      showToast('Image added. Drag it in the preview or save to publish.', 'success')
    } finally {
      setUploading(null)
    }
  }

  async function onVideoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading('video')
    try {
      const url = await uploadFile(file, 'video')
      if (!url) return
      const type = file.type || 'video/mp4'
      appendToPreview(
        `<p><video controls preload="metadata" class="w-full rounded-xl my-4"><source src="${url}" type="${type}" />Your browser does not support embedded video.</video></p>`,
      )
      showToast('Video added. Save to publish.', 'success')
    } finally {
      setUploading(null)
    }
  }

  function addYouTube() {
    const raw = window.prompt('Paste a YouTube or Vimeo URL:')
    if (!raw) return
    const embed = toEmbedUrl(raw)
    if (!embed) {
      showToast('That does not look like a YouTube or Vimeo URL.', 'error')
      return
    }
    appendToPreview(
      `<p><iframe src="${embed}" class="w-full aspect-video rounded-xl my-4" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></p>`,
    )
    showToast('Embed added. Save to publish.', 'success')
  }

  async function makeDefault() {
    // Capture whatever's currently in the preview (including any inline edits)
    // as the default. We deliberately don't try to compare innerHTML to the
    // saved html string to detect unsaved edits — the browser normalises
    // innerHTML (attribute order, quoting, whitespace), so they almost never
    // match byte-for-byte even when nothing changed, and the old comparison
    // made the button silently bail. Instead we save first, then snapshot.
    commitPreviewEdit()
    const toCapture = previewRef.current?.innerHTML ?? html
    if (!toCapture.trim()) {
      showToast('There is no content to save as the default yet.', 'error')
      return
    }
    if (hasDefault && !window.confirm('Replace the existing default with the current Home page?')) {
      return
    }
    setSettingDefault(true)
    try {
      // Persist the live page first so the snapshot the API copies matches
      // what's on screen.
      const saveRes = await fetch('/api/super-admin/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlContent: toCapture, brief }),
      })
      const saveData = await saveRes.json().catch(() => null)
      if (!saveRes.ok) {
        showToast(saveData?.error ?? 'Could not save before snapshotting default.', 'error')
        return
      }
      if (saveData?.htmlContent) setHtml(saveData.htmlContent)
      if (saveData?.updatedAt) setUpdatedAt(saveData.updatedAt)

      const res = await fetch('/api/super-admin/home/set-default', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        showToast(data?.error ?? 'Could not save default.', 'error')
        return
      }
      setHasDefault(true)
      setDefaultSetAt(data?.defaultSetAt ?? new Date().toISOString())
      showToast('Saved as the default. You can roll back to this any time.', 'success')
    } catch {
      showToast('Could not save default.', 'error')
    } finally {
      setSettingDefault(false)
    }
  }

  async function resetToDefault() {
    if (!hasDefault) {
      showToast('No default has been captured yet.', 'error')
      return
    }
    if (!window.confirm('Replace the live Home page with the default? Your current unsaved edits will be lost.')) {
      return
    }
    setResetting(true)
    try {
      const res = await fetch('/api/super-admin/home/reset-to-default', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? 'Reset failed.', 'error')
        return
      }
      setHtml(data.htmlContent ?? '')
      setBrief(data.brief ?? '')
      setUpdatedAt(data.updatedAt ?? null)
      showToast('Home page reset to the default and published.', 'success')
    } catch {
      showToast('Reset failed.', 'error')
    } finally {
      setResetting(false)
    }
  }

  function undoLastAiChange() {
    if (previousHtml === null) return
    const restore = previousHtml
    setHtml(restore)
    setPreviousHtml(null)
    setPreviousAction(null)
    showToast('Reverted the last AI change.', 'success')
  }

  async function generate() {
    const usingExample = !brief.trim()
    const briefToSend = usingExample ? EXAMPLE_BRIEF : brief
    // Snapshot whatever the editor currently has (including in-progress inline
    // edits) so the user can undo this AI overwrite.
    const before = previewRef.current?.innerHTML ?? html
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
      setPreviousHtml(before)
      setPreviousAction('generate')
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
    // Snapshot the pre-modify HTML so the user can undo if the AI's tweak
    // isn't what they wanted.
    const before = previewRef.current?.innerHTML ?? html
    setModifying(true)
    try {
      const res = await fetch('/api/super-admin/home/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction, currentHtml: before }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? 'Update failed.', 'error')
        return
      }
      setPreviousHtml(before)
      setPreviousAction('modify')
      setHtml(data.html ?? '')
      setInstruction('')
      showToast('Layout updated. Click Undo if it’s not right, or Save to publish.', 'success')
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

        {/* Media toolbar — appends to the end of the preview */}
        <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Insert:</span>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploading !== null || loading || generating || modifying || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {uploading === 'image' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            Image
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploading !== null || loading || generating || modifying || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {uploading === 'video' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Film className="h-4 w-4" />
            )}
            Video file
          </button>
          <button
            type="button"
            onClick={addYouTube}
            disabled={uploading !== null || loading || generating || modifying || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Youtube className="h-4 w-4" />
            YouTube / Vimeo
          </button>
          <span className="text-xs text-slate-500 dark:text-slate-500 ml-auto">
            Added items appear at the bottom of the preview — drag to reposition.
          </span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/svg+xml"
            hidden
            onChange={onImagePick}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            hidden
            onChange={onVideoPick}
          />
        </div>

        {/* Locked logo header — matches the live page */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-20 w-auto" />
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

        <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
          <button
            onClick={resetToDefault}
            disabled={resetting || saving || loading || !hasDefault}
            title={
              hasDefault
                ? defaultSetAt
                  ? `Restore the default saved on ${new Date(defaultSetAt).toLocaleString('en-GB')}`
                  : 'Restore the saved default'
                : 'No default has been captured yet'
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {resetting ? 'Resetting…' : 'Reset to default'}
          </button>
          <button
            onClick={makeDefault}
            disabled={settingDefault || saving || loading || !html}
            title="Save the current Home page as the default. Editors can roll back to this any time."
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {settingDefault ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkCheck className="h-4 w-4" />}
            {settingDefault ? 'Saving default…' : hasDefault ? 'Replace default' : 'Make this the default'}
          </button>
          {hasDefault && defaultSetAt && (
            <span className="text-xs text-slate-500 dark:text-slate-500">
              Default last updated {new Date(defaultSetAt).toLocaleDateString('en-GB')}
            </span>
          )}
          <div className="flex-1" />
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
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={modify}
            disabled={modifying || loading || !html}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 disabled:opacity-50"
          >
            {modifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {modifying ? 'Updating…' : 'Apply changes'}
          </button>
          <button
            onClick={undoLastAiChange}
            disabled={previousHtml === null || modifying || generating || saving || loading}
            title={
              previousHtml === null
                ? 'Nothing to undo — apply an AI change first'
                : `Revert the last ${previousAction === 'generate' ? 'Generate' : 'Modify'} action`
            }
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" />
            Undo last AI change
          </button>
          {previousHtml !== null && (
            <span className="text-xs text-slate-500 dark:text-slate-500">
              Last AI action: {previousAction === 'generate' ? 'Generate' : 'Modify'}
            </span>
          )}
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

      <HowToPanel title="How to use the Home Page Builder">
        <HomePageBuilderHowTo />
      </HowToPanel>
    </div>
  )
}
