'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Attachment = { id: string; filename: string; url: string; sizeBytes: number }

export function JobAttachmentsPanel({ jobId, initial }: { jobId: string; initial: Attachment[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Attachment[]>(initial)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/super-admin/jobs/${jobId}/attachments`, { method: 'POST', body: fd })
    if (!res.ok) {
      const msg = await res.json().catch(() => ({}))
      setError(msg.error ?? 'Upload failed')
      return
    }
    const { attachment } = await res.json()
    setItems((prev) => [attachment, ...prev])
    router.refresh()
  }

  async function remove(id: string) {
    const res = await fetch(`/api/super-admin/jobs/${jobId}/attachments/${id}`, { method: 'DELETE' })
    if (res.ok) setItems((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Attachments</h2>
      <input type="file" accept="application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
      {error && <p className="text-rose-700 text-sm">{error}</p>}
      <ul className="space-y-1">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between border rounded p-2">
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700">{a.filename}</a>
            <button type="button" className="text-rose-700 text-sm" onClick={() => remove(a.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
