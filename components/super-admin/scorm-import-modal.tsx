'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Package, X } from 'lucide-react'
import { upload } from '@vercel/blob/client'

interface ScormImportModalProps {
  open: boolean
  onClose: () => void
  onCreated: (programId: string) => void
}

/**
 * Modal for creating a new TrainingProgram from a SCORM 1.2 or 2004 zip. The program
 * is auto-scaffolded with one Module and one Lesson; the admin edits metadata
 * afterwards on the training page.
 *
 * Upload flow (two-stage, needed to bypass the 4.5 MB serverless body limit):
 *   1. `upload()` uploads the zip directly from the browser to Vercel Blob,
 *      using a short-lived token minted by
 *      `POST /api/super-admin/training/scorm-import/upload-url`.
 *   2. `POST /api/super-admin/training/scorm-import` is called with JSON
 *      `{ blobUrl, filename, name? }` — the server fetches the zip back from
 *      Blob, scaffolds the DB rows, extracts the package, and cleans up.
 *
 * Extraction can take 10–60 seconds for large packages. We show a blocking
 * in-progress state and disable the cancel button while uploading so the
 * admin doesn't submit twice or close the modal mid-upload (which would leak
 * a half-scaffolded program — the server's rollback handles extract failures,
 * but not client disconnects).
 */
export function ScormImportModal({ open, onClose, onCreated }: ScormImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset state each time the modal reopens so a previous failure doesn't
  // leave stale error text on-screen.
  useEffect(() => {
    if (open) {
      setFile(null)
      setName('')
      setError(null)
      setUploading(false)
      setProgress(null)
      setStatusText(null)
    }
  }, [open])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!file || uploading) return

      setUploading(true)
      setError(null)
      setProgress(0)
      setStatusText('Uploading package…')

      // Stall detector — if the browser can't reach Vercel Blob (CSP block,
      // offline, DNS failure) the SDK silently sits forever with no progress.
      // We watch for any `onUploadProgress` event within STALL_MS; if none
      // fires we abort and show a "couldn't reach Blob storage" message.
      const STALL_MS = 20_000
      const abortController = new AbortController()
      let lastProgressAt = Date.now()
      const stallTimer = setInterval(() => {
        if (Date.now() - lastProgressAt > STALL_MS) {
          abortController.abort()
        }
      }, 2_000)

      try {
        // Stage 1 — upload the zip directly from the browser to Blob.
        const pathname = `scorm-imports/${Date.now()}-${file.name}`
        const blob = await upload(pathname, file, {
          access: 'public',
          handleUploadUrl: '/api/super-admin/training/scorm-import/upload-url',
          abortSignal: abortController.signal,
          onUploadProgress: (event) => {
            lastProgressAt = Date.now()
            // `percentage` is 0–100; fall back to computing it if older client
            // versions only surface bytes.
            const percent =
              typeof event.percentage === 'number'
                ? event.percentage
                : event.total > 0
                  ? (event.loaded / event.total) * 100
                  : 0
            setProgress(Math.min(99, Math.round(percent)))
          },
        })
        clearInterval(stallTimer)

        // Stage 2 — ask the server to extract and scaffold.
        setProgress(100)
        setStatusText('Processing package…')
        const res = await fetch('/api/super-admin/training/scorm-import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            blobUrl: blob.url,
            filename: file.name,
            ...(name.trim().length > 0 ? { name: name.trim() } : {}),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.programId) {
          throw new Error(data?.error ?? 'Import failed')
        }
        onCreated(data.programId)
      } catch (err) {
        clearInterval(stallTimer)
        // Surface a clearer message when the browser couldn't reach Blob
        // storage at all (typically a CSP `connect-src` block, an offline
        // network, or a DNS failure). The raw SDK error in these cases is
        // usually an unhelpful `AbortError` or generic `Failed to fetch`.
        const raw = err instanceof Error ? err.message : 'Import failed'
        const looksLikeNetworkBlock =
          abortController.signal.aborted ||
          /aborted|failed to fetch|network|load failed/i.test(raw)
        setError(
          looksLikeNetworkBlock
            ? "Couldn't reach Vercel Blob storage. Check your network connection — if this persists, an admin may need to allow blob.vercel-storage.com in the site's Content Security Policy."
            : raw,
        )
        setUploading(false)
        setProgress(null)
        setStatusText(null)
      }
    },
    [file, name, uploading, onCreated],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorm-import-title"
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="scorm-import-title"
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                Import SCORM Package
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload a SCORM 1.2 or 2004 .zip to create a new training program.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="scorm-import-file"
              className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              SCORM package (.zip)
            </label>
            <input
              id="scorm-import-file"
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              disabled={uploading}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/40 dark:file:text-primary-300"
              required
            />
            {file && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="scorm-import-name"
              className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Program name <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="scorm-import-name"
              type="text"
              value={name}
              disabled={uploading}
              placeholder="Derived from the zip filename if blank"
              onChange={(e) => setName(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

          {uploading && progress !== null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>{statusText ?? 'Uploading…'}</span>
                <span>{progress}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
              >
                <div
                  className="h-full bg-primary-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
            Creates a <strong>draft</strong> program with one module and one
            lesson containing the SCORM package. You can rename it, assign it
            to organisations, and approve it afterwards.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {statusText ?? 'Uploading…'}
                </>
              ) : (
                <>
                  <Package className="h-4 w-4" />
                  Import
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
