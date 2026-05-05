'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, Layers, Save, X } from 'lucide-react'
import { clsx } from 'clsx'

export interface ManagedSection {
  id: string
  title: string
  description: string | null
  order: number
  _count?: { documents: number }
}

interface Props {
  collectionId: string
  sections: ManagedSection[]
  onChanged: () => void | Promise<void>
  onError?: (msg: string) => void
}

// Authoring panel for LibrarySection rows on a collection. Mirrors the
// up/down reorder pattern from the Training modules list — two PATCH
// requests per swap, sequential order ints. No drag-and-drop in v1.
export function SectionsManager({ collectionId, sections, onChanged, onError }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [busyId, setBusyId] = useState<string | null>(null)

  function fail(msg: string) {
    onError?.(msg)
  }

  async function handleCreate() {
    const title = newTitle.trim()
    if (!title) return
    setCreating(true)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: newDescription.trim() || undefined }),
      })
      if (!res.ok) {
        fail('Failed to create section.')
        return
      }
      setNewTitle('')
      setNewDescription('')
      setShowForm(false)
      await onChanged()
    } finally {
      setCreating(false)
    }
  }

  function startEdit(s: ManagedSection) {
    setEditingId(s.id)
    setEditTitle(s.title)
    setEditDescription(s.description ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditDescription('')
  }

  async function saveEdit(id: string) {
    const title = editTitle.trim()
    if (!title) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/sections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: editDescription.trim() || null }),
      })
      if (!res.ok) {
        fail('Failed to update section.')
        return
      }
      cancelEdit()
      await onChanged()
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(s: ManagedSection) {
    const docCount = s._count?.documents ?? 0
    const msg = docCount > 0
      ? `Delete "${s.title}"? Its ${docCount} document${docCount === 1 ? '' : 's'} will move to the Other resources group (not deleted).`
      : `Delete "${s.title}"?`
    if (!confirm(msg)) return
    setBusyId(s.id)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/sections/${s.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        fail('Failed to delete section.')
        return
      }
      await onChanged()
    } finally {
      setBusyId(null)
    }
  }

  // Swap order with the section above (direction=-1) or below (+1) in the
  // ordered list. Two PATCH requests, mirrors swapModuleOrder in training.
  async function handleSwap(index: number, direction: -1 | 1) {
    const a = sections[index]
    const b = sections[index + direction]
    if (!a || !b) return
    setBusyId(a.id)
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/super-admin/library/${collectionId}/sections/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: b.order }),
        }),
        fetch(`/api/super-admin/library/${collectionId}/sections/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: a.order }),
        }),
      ])
      if (!r1.ok || !r2.ok) fail('Failed to reorder sections.')
      await onChanged()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Sections</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({sections.length})
          </span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 inline-flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          {showForm ? 'Close' : 'Add section'}
        </button>
      </div>

      {showForm && (
        <div className="px-4 py-3 bg-calm-50 dark:bg-slate-800/40 border-b border-calm-200 dark:border-slate-700 space-y-2">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
              Section title
            </label>
            <input
              className="input w-full text-sm"
              placeholder="e.g. Workshop 1 — handouts"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              className="input w-full text-sm"
              placeholder="One-line summary shown above the section"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setNewTitle('')
                setNewDescription('')
              }}
              className="px-3 py-1.5 rounded-lg border border-calm-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 disabled:opacity-40"
            >
              {creating ? 'Creating…' : 'Create section'}
            </button>
          </div>
        </div>
      )}

      {sections.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
          No sections yet. Without sections all documents render as a flat grid (this is fine).
        </div>
      ) : (
        <ul className="divide-y divide-calm-100 dark:divide-slate-700">
          {sections.map((s, i) => {
            const isFirst = i === 0
            const isLast = i === sections.length - 1
            const isEditing = editingId === s.id
            return (
              <li key={s.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <button
                    type="button"
                    disabled={isFirst || busyId === s.id}
                    onClick={() => handleSwap(i, -1)}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-25 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isLast || busyId === s.id}
                    onClick={() => handleSwap(i, 1)}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-25 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        className="input w-full text-sm"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                      <input
                        className="input w-full text-sm"
                        placeholder="Description (optional)"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                      <div className="flex justify-end gap-1">
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
                          onClick={() => saveEdit(s.id)}
                          disabled={savingEdit || !editTitle.trim()}
                          className="p-1.5 rounded text-primary-600 hover:bg-primary-50 disabled:opacity-40"
                          title="Save"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{s.title}</p>
                      {s.description ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{s.description}</p>
                      ) : null}
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {s._count?.documents ?? 0} document{(s._count?.documents ?? 0) === 1 ? '' : 's'}
                      </p>
                    </>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      title="Rename / edit description"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      disabled={busyId === s.id}
                      className={clsx(
                        'p-1.5 rounded-lg transition-colors disabled:opacity-40',
                        'text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
                      )}
                      title="Delete section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
