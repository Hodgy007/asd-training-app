'use client'

import { useState } from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import JSZip from 'jszip'
import { upload } from '@vercel/blob/client'
import {
  Globe2,
  ExternalLink,
  Archive,
  Trash2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { ALLOWED_EXTENSIONS, BLOCKED_EXTENSIONS } from '@/lib/upload-validation'

interface Props {
  collectionId: string
  publishedToToolkit: boolean
  documentCount: number
  /** Called whenever an action mutates the collection so the parent can refetch. */
  onUpdate: () => void
  /** Toast surface — parent owns the actual toast UI. */
  onToast: (message: string, type: 'success' | 'error') => void
}

interface ZipResults {
  created: number
  errors: { fileName: string; error: string }[]
  total: number
}

/**
 * Collection-level actions used in both the list-page edit form and the
 * detail-page edit form. Owns its own ZIP upload + clear-all state so each
 * mount tracks progress independently.
 */
export function CollectionActionsPanel({
  collectionId,
  publishedToToolkit,
  documentCount,
  onUpdate,
  onToast,
}: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [zipUploading, setZipUploading] = useState(false)
  const [zipProgress, setZipProgress] = useState<number | null>(null)
  const [zipStatusText, setZipStatusText] = useState<string | null>(null)
  const [zipResults, setZipResults] = useState<ZipResults | null>(null)
  const [zipErrorsExpanded, setZipErrorsExpanded] = useState(false)
  const [clearingDocs, setClearingDocs] = useState(false)

  async function handleTogglePublish() {
    setActionLoading('publish')
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedToToolkit: !publishedToToolkit }),
      })
      if (res.ok) {
        onToast(
          publishedToToolkit ? 'Removed from public Toolkit.' : 'Published to public Toolkit.',
          'success'
        )
        onUpdate()
      } else {
        const d = await res.json()
        onToast(d.error || 'Update failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleZipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const zipFile = e.target.files?.[0]
    e.target.value = ''
    if (!zipFile) return
    setZipUploading(true)
    setZipProgress(0)
    setZipStatusText('Reading ZIP…')
    setZipResults(null)
    setZipErrorsExpanded(false)

    const errors: { fileName: string; error: string }[] = []
    let createdCount = 0

    try {
      const zip = await JSZip.loadAsync(zipFile)

      const entries = Object.values(zip.files).filter((entry) => {
        if (entry.dir) return false
        const name = entry.name
        if (name.startsWith('__MACOSX/') || name.includes('/__MACOSX/')) return false
        const base = name.split('/').pop() || ''
        if (base.startsWith('.')) return false
        return true
      })

      if (entries.length === 0) {
        onToast('ZIP contained no usable files.', 'error')
        return
      }

      const total = entries.length
      const CONCURRENCY = 4
      let cursor = 0
      let done = 0

      async function processOne(entry: JSZip.JSZipObject) {
        const base = (entry.name.split('/').pop() || entry.name).trim()
        const lastDot = base.lastIndexOf('.')
        const ext = lastDot === -1 || lastDot === base.length - 1 ? '' : base.slice(lastDot + 1).toLowerCase()

        try {
          if (!ext) {
            errors.push({ fileName: base, error: 'No file extension — skipped.' })
            return
          }
          if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
            errors.push({ fileName: base, error: `".${ext}" files are not allowed for security reasons.` })
            return
          }
          if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
            errors.push({ fileName: base, error: `".${ext}" is not a supported file type.` })
            return
          }

          const fileBlob = await entry.async('blob')
          const uploaded = await upload(`library/documents/${base}`, fileBlob, {
            access: 'public',
            handleUploadUrl: '/api/super-admin/library/upload/upload-url',
          })

          const titleBase = base.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() || base
          const res = await fetch(`/api/super-admin/library/${collectionId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: titleBase,
              description: 'Uploaded from ZIP.',
              fileUrl: uploaded.url,
              fileName: base,
              fileSize: fileBlob.size,
              fileType: fileBlob.type || 'application/octet-stream',
            }),
          })

          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            errors.push({ fileName: base, error: data.error || 'Failed to save document record.' })
            return
          }
          createdCount++
        } catch (err) {
          errors.push({ fileName: base, error: err instanceof Error ? err.message : 'Upload failed.' })
        } finally {
          done++
          setZipProgress(Math.round((done / total) * 100))
          setZipStatusText(`Processing ${done} of ${total}…`)
        }
      }

      async function worker() {
        while (cursor < entries.length) {
          const idx = cursor++
          await processOne(entries[idx])
        }
      }

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, () => worker()))

      setZipResults({ created: createdCount, errors, total })
      if (createdCount > 0) onUpdate()
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'ZIP upload failed.'
      onToast(raw, 'error')
    } finally {
      setZipUploading(false)
      setZipProgress(null)
      setZipStatusText(null)
    }
  }

  async function handleClearAllDocs() {
    if (documentCount === 0) return
    if (!confirm(`Delete all ${documentCount} document${documentCount === 1 ? '' : 's'} in this collection? This cannot be undone.`)) return
    setClearingDocs(true)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/documents`, { method: 'DELETE' })
      if (res.ok) {
        onToast(`Cleared ${documentCount} document${documentCount === 1 ? '' : 's'}.`, 'success')
        onUpdate()
      } else {
        const d = await res.json()
        onToast(d.error || 'Failed to clear documents.', 'error')
      }
    } finally {
      setClearingDocs(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleTogglePublish}
          disabled={actionLoading === 'publish'}
          className={clsx(
            'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors disabled:opacity-50',
            publishedToToolkit
              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
              : 'border-calm-200 bg-white text-slate-600 hover:bg-calm-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          )}
        >
          <Globe2 className="h-4 w-4" />
          {publishedToToolkit ? 'Live on Toolkit — click to unpublish' : 'Publish to Toolkit'}
        </button>
        <Link
          href={`/library?c=${collectionId}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Preview as learner
        </Link>
        {publishedToToolkit && (
          <Link
            href={`/toolkit/${collectionId}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Preview toolkit
          </Link>
        )}
        <label className={clsx(
          'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer',
          zipUploading
            ? 'opacity-50 cursor-not-allowed border-calm-200 dark:border-slate-600 text-slate-400'
            : 'border-calm-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-calm-50 dark:hover:bg-slate-700'
        )}>
          <Archive className="h-4 w-4" />
          {zipUploading ? 'Uploading ZIP…' : 'Upload ZIP'}
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            disabled={zipUploading}
            onChange={handleZipUpload}
          />
        </label>
        <button
          type="button"
          onClick={handleClearAllDocs}
          disabled={clearingDocs || zipUploading || documentCount === 0}
          className={clsx(
            'inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors',
            clearingDocs || documentCount === 0
              ? 'opacity-50 cursor-not-allowed border-calm-200 dark:border-slate-600 text-slate-400'
              : 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20',
          )}
          title="Delete all documents but keep the collection"
        >
          <Trash2 className="h-4 w-4" />
          {clearingDocs ? 'Clearing…' : 'Clear all documents'}
        </button>
      </div>

      {zipUploading && zipProgress !== null && (
        <div className="rounded-xl border border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>{zipStatusText ?? 'Uploading…'}</span>
            <span className="font-semibold">{zipProgress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-calm-200 dark:bg-slate-700 overflow-hidden">
            <div className="h-full bg-primary-500 transition-all" style={{ width: `${zipProgress}%` }} />
          </div>
        </div>
      )}

      {zipResults && (
        <div className={clsx(
          'rounded-xl border p-3',
          zipResults.errors.length > 0
            ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
            : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
        )}>
          <div className="flex items-start gap-2">
            {zipResults.errors.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            ) : null}
            <div className="flex-1 text-sm">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                Added {zipResults.created} of {zipResults.total} files.
                {zipResults.errors.length > 0 && ` ${zipResults.errors.length} skipped.`}
              </p>
              {zipResults.errors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setZipErrorsExpanded((v) => !v)}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:underline"
                >
                  <ChevronDown className={clsx('h-3 w-3 transition-transform', zipErrorsExpanded && 'rotate-180')} />
                  {zipErrorsExpanded ? 'Hide details' : 'Show skipped files'}
                </button>
              )}
              {zipErrorsExpanded && (
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {zipResults.errors.map((err, i) => (
                    <li key={i}><strong>{err.fileName}:</strong> {err.error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
