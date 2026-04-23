'use client'

import { useState } from 'react'

interface ScormUploadProps {
  lessonId: string
  initial?: {
    scormBlobPrefix: string | null
    scormEntryPath: string | null
    scormVersion: string | null
  }
}

export function ScormUpload({ lessonId, initial }: ScormUploadProps) {
  const [state, setState] = useState(initial ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    setBusy(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`/api/super-admin/training/lessons/${lessonId}/scorm`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setState(data.lesson)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/super-admin/training/lessons/${lessonId}/scorm`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Remove failed')
      setState(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="font-semibold">SCORM package</h3>
      {state?.scormEntryPath ? (
        <div className="space-y-2 text-sm">
          <p><strong>Entry file:</strong> {state.scormEntryPath}</p>
          <p><strong>Version:</strong> {state.scormVersion}</p>
          <div className="flex gap-2">
            <a
              href={`/api/scorm/${lessonId}/${state.scormEntryPath}`}
              target="_blank"
              rel="noreferrer"
              className="rounded border px-3 py-1"
            >Preview</a>
            <button onClick={handleRemove} disabled={busy} className="rounded border px-3 py-1">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="block cursor-pointer rounded border-2 border-dashed p-6 text-center">
          <input
            type="file"
            accept=".zip"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleUpload(f)
            }}
          />
          <span>{busy ? 'Uploading…' : 'Click to upload SCORM .zip (max 200 MB)'}</span>
        </label>
      )}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
}
