'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import { clsx } from 'clsx'
import {
  ArrowLeft,
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Save,
  X,
  FileText,
  FileArchive,
  FolderInput,
  Check,
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  LOGO: 'Logo',
  BRAND_GUIDELINES: 'Brand guidelines',
  IMAGERY: 'Imagery',
  COLOUR_PALETTE: 'Colour palette',
  MESSAGING: 'Messaging / tone of voice',
  OTHER: 'Other',
}
const TYPES = Object.keys(TYPE_LABELS) as Array<keyof typeof TYPE_LABELS>

interface BrandAsset {
  id: string
  type: keyof typeof TYPE_LABELS
  title: string
  description: string | null
  fileUrl: string
  fileName: string
  fileSize: number
  fileType: string
  active: boolean
  createdAt: string
  uploadedBy: { name: string | null }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageType(fileType: string): boolean {
  return fileType.startsWith('image/')
}

export default function BrandAssetsPage() {
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [filterType, setFilterType] = useState<string>('')

  // Upload form state
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'single' | 'zip'>('single')
  const [formType, setFormType] = useState<keyof typeof TYPE_LABELS>('LOGO')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [autoClassify, setAutoClassify] = useState(true)
  const [zipResult, setZipResult] = useState<{
    created: number
    skipped: Array<{ name: string; reason: string }>
    bySection?: Record<keyof typeof TYPE_LABELS, number>
  } | null>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editType, setEditType] = useState<keyof typeof TYPE_LABELS>('LOGO')
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Move-to-section popover state — only one open at a time
  const [moveMenuOpenId, setMoveMenuOpenId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/brand-assets', { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json()
        setAssets(j.assets ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  function resetForm() {
    setFormMode('single')
    setFormType('LOGO')
    setFormTitle('')
    setFormDescription('')
    setFormFile(null)
    setAutoClassify(true)
    setZipResult(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!formFile) return
    if (formMode === 'single' && !formTitle.trim()) return
    setFormSubmitting(true)
    setZipResult(null)
    try {
      if (formMode === 'zip') {
        const blob = await upload(`brand-assets-zips/${formFile.name}`, formFile, {
          access: 'public',
          handleUploadUrl: '/api/super-admin/library/upload/upload-url',
        })
        const res = await fetch('/api/super-admin/brand-assets/import-zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blobUrl: blob.url, type: formType, autoClassify }),
        })
        if (res.ok) {
          const j = (await res.json()) as {
            created: number
            skipped: Array<{ name: string; reason: string }>
            bySection?: Record<keyof typeof TYPE_LABELS, number>
          }
          setZipResult({ created: j.created, skipped: j.skipped ?? [], bySection: j.bySection })
          if (j.created > 0) {
            showToast(`Imported ${j.created} ${j.created === 1 ? 'asset' : 'assets'} from zip.`, 'success')
            setFormFile(null)
            fetchAssets()
          } else {
            showToast('No assets imported. See details below.', 'error')
          }
        } else {
          const j = await res.json().catch(() => ({}))
          showToast(j?.error ?? 'Zip import failed.', 'error')
        }
      } else {
        const blob = await upload(`brand-assets/${formFile.name}`, formFile, {
          access: 'public',
          handleUploadUrl: '/api/super-admin/library/upload/upload-url',
        })
        const res = await fetch('/api/super-admin/brand-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: formType,
            title: formTitle.trim(),
            description: formDescription.trim() || undefined,
            fileUrl: blob.url,
            fileName: formFile.name,
            fileSize: formFile.size,
            fileType: formFile.type || 'application/octet-stream',
          }),
        })
        if (res.ok) {
          showToast('Brand asset uploaded.', 'success')
          setShowForm(false)
          resetForm()
          fetchAssets()
        } else {
          const j = await res.json().catch(() => ({}))
          showToast(j?.error ?? 'Upload failed.', 'error')
        }
      }
    } catch {
      showToast(formMode === 'zip' ? 'Zip import failed.' : 'Upload failed.', 'error')
    } finally {
      setFormSubmitting(false)
    }
  }

  function startEdit(a: BrandAsset) {
    setEditingId(a.id)
    setEditType(a.type)
    setEditTitle(a.title)
    setEditDescription(a.description ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/super-admin/brand-assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editType,
          title: editTitle.trim(),
          description: editDescription.trim() || null,
        }),
      })
      if (res.ok) {
        showToast('Brand asset updated.', 'success')
        cancelEdit()
        fetchAssets()
      } else {
        const j = await res.json().catch(() => ({}))
        showToast(j?.error ?? 'Save failed.', 'error')
      }
    } finally {
      setEditSaving(false)
    }
  }

  async function toggleActive(a: BrandAsset) {
    const res = await fetch(`/api/super-admin/brand-assets/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !a.active }),
    })
    if (res.ok) fetchAssets()
  }

  async function moveToSection(a: BrandAsset, newType: keyof typeof TYPE_LABELS) {
    if (newType === a.type) {
      setMoveMenuOpenId(null)
      return
    }
    setMovingId(a.id)
    try {
      const res = await fetch(`/api/super-admin/brand-assets/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType }),
      })
      if (res.ok) {
        showToast(`Moved to ${TYPE_LABELS[newType]}.`, 'success')
        setMoveMenuOpenId(null)
        fetchAssets()
      } else {
        showToast('Move failed.', 'error')
      }
    } finally {
      setMovingId(null)
    }
  }

  async function handleDelete(a: BrandAsset) {
    if (!confirm(`Delete "${a.title}"? This removes it from the brand store and its file from storage.`)) return
    const res = await fetch(`/api/super-admin/brand-assets/${a.id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Brand asset deleted.', 'success')
      fetchAssets()
    } else {
      showToast('Delete failed.', 'error')
    }
  }

  const filtered = filterType ? assets.filter((a) => a.type === filterType) : assets
  const grouped = TYPES.map((t) => ({ type: t, items: assets.filter((a) => a.type === t) }))

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
      {toast && (
        <div className={clsx(
          'fixed top-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white',
        )}>
          {toast.message}
        </div>
      )}

      <div>
        <Link href="/super-admin/products" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-fuchsia-600 dark:text-fuchsia-400" />
              Brand Assets
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Charity-owned branding for use across the platform: logos, brand guidelines, sample imagery,
              colour palette, tone-of-voice. AI generators can be told to draw on these. Image-upload fields
              can offer them as a pick-from-store alternative to a fresh upload.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Close' : 'Add asset'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New brand asset</h2>
          <div className="inline-flex rounded-xl border border-calm-200 dark:border-slate-600 p-0.5 bg-calm-50 dark:bg-slate-700">
            <button
              type="button"
              onClick={() => { setFormMode('single'); setZipResult(null) }}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                formMode === 'single'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700',
              )}
            >
              <FileText className="h-4 w-4" />
              Single file
            </button>
            <button
              type="button"
              onClick={() => { setFormMode('zip'); setZipResult(null) }}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                formMode === 'zip'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700',
              )}
            >
              <FileArchive className="h-4 w-4" />
              Bulk upload (zip)
            </button>
          </div>
          {formMode === 'zip' && (
            <div className="rounded-xl border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700/40 p-3 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={autoClassify}
                  onChange={(e) => setAutoClassify(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-200">Auto-organise into sections</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Match folder + filename keywords (e.g. <em>logos</em>, <em>brand guidelines</em>, <em>palette</em>, <em>tone of voice</em>, <em>imagery</em>) and route each file to the right section. Anything unmatched goes to the default below.
                  </span>
                </span>
              </label>
            </div>
          )}
          <div>
            <label className="label">{formMode === 'zip' && autoClassify ? 'Default section (for unmatched files)' : 'Section'}</label>
            <select
              className="input w-full"
              value={formType}
              onChange={(e) => setFormType(e.target.value as keyof typeof TYPE_LABELS)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            {formMode === 'zip' && !autoClassify && (
              <p className="text-xs text-slate-400 mt-1">
                Every file inside the zip will be added to the <strong>{TYPE_LABELS[formType]}</strong> section.
              </p>
            )}
          </div>
          {formMode === 'single' && (
            <>
              <div>
                <label className="label">Title</label>
                <input
                  className="input w-full"
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Primary logo (full colour, RGB)"
                  required
                />
              </div>
              <div>
                <label className="label">Description <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea
                  className="input w-full min-h-[60px] resize-y"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="When to use this, alt text, anything the AI should know."
                />
              </div>
            </>
          )}
          <div>
            <label className="label">{formMode === 'zip' ? 'Zip file' : 'File'}</label>
            <input
              type="file"
              className="input w-full"
              accept={formMode === 'zip' ? '.zip,application/zip,application/x-zip-compressed' : 'image/*,application/pdf,text/plain,text/markdown,.docx'}
              onChange={(e) => { setFormFile(e.target.files?.[0] ?? null); setZipResult(null) }}
              required
            />
            {formFile && (
              <p className="text-xs text-slate-400 mt-1">{formFile.name} · {formatFileSize(formFile.size)}</p>
            )}
            {formMode === 'zip' && (
              <p className="text-xs text-slate-400 mt-1">
                Filenames become titles. Max 100 MB compressed, 200 files. Allowed: images, PDFs, Office docs, txt/csv/md, mp4/webm.
              </p>
            )}
          </div>
          {zipResult && (
            <div className="rounded-xl border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700/40 p-3 text-sm space-y-2">
              <p className="font-medium text-slate-700 dark:text-slate-200">
                Imported {zipResult.created} {zipResult.created === 1 ? 'asset' : 'assets'}
                {zipResult.skipped.length > 0 && ` · skipped ${zipResult.skipped.length}`}.
              </p>
              {zipResult.bySection && zipResult.created > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {TYPES.filter((t) => (zipResult.bySection?.[t] ?? 0) > 0).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-calm-200 dark:border-slate-600"
                    >
                      {TYPE_LABELS[t]} <span className="text-slate-400">{zipResult.bySection?.[t]}</span>
                    </span>
                  ))}
                </div>
              )}
              {zipResult.skipped.length > 0 && (
                <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc pl-4 max-h-32 overflow-y-auto">
                  {zipResult.skipped.map((s, i) => (
                    <li key={i}><span className="font-mono">{s.name}</span> — {s.reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm() }}
              className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting || !formFile || (formMode === 'single' && !formTitle.trim())}
              className="btn-primary disabled:opacity-50"
            >
              {formSubmitting
                ? (formMode === 'zip' ? 'Importing…' : 'Uploading…')
                : (formMode === 'zip' ? 'Import zip' : 'Upload asset')}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <select
          className="input text-sm"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All types ({assets.length})</option>
          {TYPES.map((t) => {
            const count = assets.filter((a) => a.type === t).length
            return <option key={t} value={t}>{TYPE_LABELS[t]} ({count})</option>
          })}
        </select>
        <button
          type="button"
          onClick={fetchAssets}
          className="p-2 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500"
          title="Refresh"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
        </button>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          {filtered.length} {filtered.length === 1 ? 'asset' : 'assets'}
        </span>
      </div>

      {loading && assets.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {filterType ? `No ${TYPE_LABELS[filterType].toLowerCase()} assets yet.` : 'No brand assets yet.'}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Upload logos, brand guidelines, sample imagery, palette swatches.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(filterType ? [{ type: filterType as keyof typeof TYPE_LABELS, items: filtered }] : grouped.filter((g) => g.items.length > 0)).map((group) => (
            <div key={group.type}>
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2 uppercase tracking-wide">
                {TYPE_LABELS[group.type]} <span className="text-slate-400 font-normal">({group.items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((a) => {
                  const isImg = isImageType(a.fileType)
                  const isEditing = editingId === a.id
                  return (
                    <div key={a.id} className={clsx(
                      'card p-0 overflow-hidden flex flex-col',
                      !a.active && 'opacity-60',
                    )}>
                      <div className="relative aspect-[4/3] bg-calm-50 dark:bg-slate-700 flex items-center justify-center">
                        {isImg ? (
                          <img src={a.fileUrl} alt={a.title} className="h-full w-full object-contain" />
                        ) : (
                          <FileText className="h-12 w-12 text-slate-300 dark:text-slate-500" />
                        )}
                      </div>
                      <div className="p-3 flex-1 flex flex-col gap-2">
                        {isEditing ? (
                          <>
                            <select
                              className="input text-xs"
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as keyof typeof TYPE_LABELS)}
                            >
                              {TYPES.map((t) => (
                                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                              ))}
                            </select>
                            <input
                              className="input text-sm font-medium"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                            <textarea
                              className="input text-xs min-h-[40px] resize-y"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Description (optional)"
                            />
                            <div className="flex justify-end gap-1 mt-auto pt-1">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-1.5 rounded text-slate-400 hover:text-slate-700"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEdit(a.id)}
                                disabled={editSaving || !editTitle.trim()}
                                className="p-1.5 rounded text-primary-600 hover:bg-primary-50 disabled:opacity-40"
                                title="Save"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{a.title}</p>
                            {a.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{a.description}</p>
                            )}
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {a.fileName} · {formatFileSize(a.fileSize)}
                            </p>
                            <div className="flex items-center justify-between gap-1 mt-auto pt-2">
                              <button
                                type="button"
                                onClick={() => toggleActive(a)}
                                className={clsx(
                                  'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                                  a.active
                                    ? 'bg-sage-100 text-sage-700 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-400'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400',
                                )}
                                title={a.active ? 'Deactivate (hides from picker / AI)' : 'Activate'}
                              >
                                {a.active ? <><Eye className="h-3 w-3" />Active</> : <><EyeOff className="h-3 w-3" />Inactive</>}
                              </button>
                              <div className="flex items-center gap-0.5">
                                <a
                                  href={a.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  title="Open file"
                                >
                                  <ImageIcon className="h-4 w-4" />
                                </a>
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setMoveMenuOpenId((id) => (id === a.id ? null : a.id))}
                                    disabled={movingId === a.id}
                                    className="p-1.5 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40"
                                    title="Move to another section"
                                  >
                                    <FolderInput className="h-4 w-4" />
                                  </button>
                                  {moveMenuOpenId === a.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setMoveMenuOpenId(null)}
                                        aria-hidden
                                      />
                                      <div
                                        role="menu"
                                        className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-calm-200 dark:border-slate-600 rounded-lg shadow-lg py-1 min-w-[180px]"
                                      >
                                        <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                          Move to
                                        </p>
                                        {TYPES.map((t) => (
                                          <button
                                            key={t}
                                            type="button"
                                            role="menuitem"
                                            onClick={() => moveToSection(a, t)}
                                            disabled={t === a.type}
                                            className={clsx(
                                              'flex items-center justify-between w-full text-left px-3 py-1.5 text-sm',
                                              t === a.type
                                                ? 'text-slate-400 dark:text-slate-500 cursor-default'
                                                : 'text-slate-700 dark:text-slate-200 hover:bg-calm-50 dark:hover:bg-slate-700',
                                            )}
                                          >
                                            <span>{TYPE_LABELS[t]}</span>
                                            {t === a.type && <Check className="h-3.5 w-3.5 text-slate-400" />}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => startEdit(a)}
                                  className="p-1.5 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(a)}
                                  className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
