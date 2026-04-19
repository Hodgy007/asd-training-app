'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Assignment = {
  id: string
  note: string | null
  user: { id: string; name: string | null; email: string; role: string }
}

export function JobAssignmentsPanel({
  jobId,
  initial,
  candidates,
}: {
  jobId: string
  initial: Assignment[]
  candidates: { id: string; name: string | null; email: string; role: string }[]
}) {
  const router = useRouter()
  const [items, setItems] = useState<Assignment[]>(initial)
  const [userId, setUserId] = useState('')
  const [note, setNote] = useState('')

  async function add() {
    if (!userId) return
    const res = await fetch(`/api/super-admin/jobs/${jobId}/assignments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, note: note || null }),
    })
    if (!res.ok) return
    const { assignment } = await res.json()
    setItems((prev) => [assignment, ...prev.filter((a) => a.user.id !== userId)])
    setUserId('')
    setNote('')
    router.refresh()
  }

  async function remove(id: string) {
    const res = await fetch(`/api/super-admin/jobs/${jobId}/assignments/${id}`, { method: 'DELETE' })
    if (res.ok) setItems((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Assign to specific people</h2>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[240px]">
          <span className="text-sm">User</span>
          <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Select…</option>
            {candidates.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email} · {u.role}</option>
            ))}
          </select>
        </label>
        <label className="flex-[2] min-w-[240px]">
          <span className="text-sm">Note (optional)</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button type="button" className="bg-slate-900 text-white px-3 py-2 rounded text-sm" onClick={add}>
          Assign
        </button>
      </div>
      <ul className="space-y-1">
        {items.map((a) => (
          <li key={a.id} className="border rounded p-2 flex items-center justify-between">
            <div>
              <div className="font-medium">{a.user.name ?? a.user.email}</div>
              <div className="text-xs text-slate-600">{a.user.role}</div>
              {a.note && <div className="text-sm text-slate-700 mt-1">"{a.note}"</div>}
            </div>
            <button type="button" className="text-rose-700 text-sm" onClick={() => remove(a.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
