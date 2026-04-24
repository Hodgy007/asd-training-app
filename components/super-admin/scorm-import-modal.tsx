'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Package, X } from 'lucide-react'

interface ScormImportModalProps {
  open: boolean
  onClose: () => void
  onCreated: (programId: string) => void
}

/**
 * Modal for creating a new TrainingProgram from a SCORM 1.2 zip. The program
 * is auto-scaffolded with one Module and one Lesson; the admin edits metadata
 * afterwards on the training page.
 *
 * POSTs multipart/form-data to `/api/super-admin/training/scorm-import`:
 *   - `file`: the .zip
 *   - `name`: optional program name override
 *
 * The real work on the server is file upload to Blob + extraction, which can
 * take 10–60 seconds for large packages. We show a blocking in-progress state
 * and disable the cancel button while uploading so the admin doesn't submit
 * twice or close the modal mid-upload (which would leak a half-scaffolded
 * program — the server's rollback handles extract failures, but not client
 * disconnects).
 */
export function ScormImportModal({ open, onClose, onCreated }: ScormImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)
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
    }
  }, [open])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!file || uploading) return

      setUploading(true)
      setError(null)

      const body = new FormData()
      body.set('file', file)
      if (name.trim().length > 0) body.set('name', name.trim())

      try {
        const res = await fetch('/api/super-admin/training/scorm-import', {
          method: 'POST',
          body,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.programId) {
          throw new Error(data?.error ?? 'Import failed')
        }
        onCreated(data.programId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed')
        setUploading(false)
      }
    },
    [file, name, uploading, onCreated],
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scorm-import-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
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
                Upload a SCORM 1.2 .zip to create a new training program.
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
              className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-300"
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
              className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>

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
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading…
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
