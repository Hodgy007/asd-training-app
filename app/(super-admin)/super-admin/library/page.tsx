'use client'

import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import {
  FolderOpen,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronUp,
  Trash2,
  Upload,
  Image as ImageIcon,
  BarChart3,
  FileText,
  ChevronRight,
  Pencil,
} from 'lucide-react'
import Link from 'next/link'

interface Organisation {
  id: string
  name: string
}

interface LibraryCollection {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  targetOrgIds: string[]
  targetRoles: string[]
  active: boolean
  createdAt: string
  createdBy: { name: string | null }
  _count: { documents: number }
}

const ROLE_OPTIONS = [
  { value: 'CAREGIVER', label: 'Practitioner' },
  { value: 'CAREER_DEV_OFFICER', label: 'Careers Professional' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'ORG_ADMIN', label: 'Org Admin' },
]

export default function LibraryPage() {
  const [collections, setCollections] = useState<LibraryCollection[]>([])
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formThumbnail, setFormThumbnail] = useState<File | null>(null)
  const [formTargetOrgIds, setFormTargetOrgIds] = useState<string[]>([])
  const [formTargetRoles, setFormTargetRoles] = useState<string[]>([])
  const [formActive, setFormActive] = useState(true)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  function startEditing(col: LibraryCollection) {
    setEditingId(col.id)
    setEditTitle(col.title)
    setEditDescription(col.description)
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/super-admin/library/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDescription }),
      })
      if (res.ok) {
        showToast('Collection updated.', 'success')
        setEditingId(null)
        fetchCollections()
      } else {
        const d = await res.json()
        showToast(d.error || 'Save failed.', 'error')
      }
    } finally {
      setEditSaving(false)
    }
  }

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/library')
      if (res.ok) setCollections(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch('/api/super-admin/organisations')
      if (res.ok) setOrgs(await res.json())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchCollections()
    fetchOrgs()
  }, [fetchCollections, fetchOrgs])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleThumbnailChange(file: File | null) {
    setFormThumbnail(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setThumbnailPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setThumbnailPreview(null)
    }
  }

  function toggleOrgId(id: string) {
    setFormTargetOrgIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function toggleRole(role: string) {
    setFormTargetRoles((prev) => prev.includes(role) ? prev.filter((x) => x !== role) : [...prev, role])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormSubmitting(true)
    try {
      let thumbnailUrl: string | null = null
      if (formThumbnail) {
        const fd = new FormData()
        fd.append('file', formThumbnail)
        fd.append('folder', 'library/thumbnails')
        const uploadRes = await fetch('/api/super-admin/library/upload', { method: 'POST', body: fd })
        if (uploadRes.ok) {
          const data = await uploadRes.json()
          thumbnailUrl = data.url
        }
      }

      const res = await fetch('/api/super-admin/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          thumbnailUrl,
          targetOrgIds: formTargetOrgIds,
          targetRoles: formTargetRoles,
          active: formActive,
        }),
      })

      if (res.ok) {
        showToast('Collection created.', 'success')
        setShowForm(false)
        setFormTitle('')
        setFormDescription('')
        setFormThumbnail(null)
        setThumbnailPreview(null)
        setFormTargetOrgIds([])
        setFormTargetRoles([])
        setFormActive(true)
        fetchCollections()
      } else {
        const d = await res.json()
        showToast(d.error || 'Create failed.', 'error')
      }
    } catch {
      showToast('Failed. Please try again.', 'error')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function toggleActive(col: LibraryCollection) {
    setActionLoading(col.id + '-toggle')
    try {
      const res = await fetch(`/api/super-admin/library/${col.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !col.active }),
      })
      if (res.ok) {
        showToast(`Collection ${!col.active ? 'activated' : 'deactivated'}.`, 'success')
        fetchCollections()
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(col: LibraryCollection) {
    if (!confirm(`Delete "${col.title}" and all its documents? This cannot be undone.`)) return
    setActionLoading(col.id + '-delete')
    try {
      const res = await fetch(`/api/super-admin/library/${col.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Collection deleted.', 'success')
        fetchCollections()
      }
    } finally {
      setActionLoading(null)
    }
  }

  function targetLabel(col: LibraryCollection): string {
    if (col.targetOrgIds.length === 0 && col.targetRoles.length === 0) return 'All users'
    const parts: string[] = []
    if (col.targetOrgIds.length > 0) {
      const orgNames = col.targetOrgIds.map((id) => orgs.find((o) => o.id === id)?.name || id)
      parts.push(orgNames.join(', '))
    }
    if (col.targetRoles.length > 0) {
      const roleNames = col.targetRoles.map((r) => ROLE_OPTIONS.find((o) => o.value === r)?.label || r)
      parts.push(roleNames.join(', '))
    }
    return parts.join(' · ')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
          toast.type === 'success' ? 'bg-sage-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            Document Library
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Create collections of documents and target them to specific organisations or roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/super-admin/library/reports"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Reports
          </Link>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary flex items-center gap-2"
          >
            {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'New Collection'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Collection</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                className="input w-full"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                placeholder="e.g. Safeguarding Policies"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input w-full min-h-[80px] resize-y"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                required
                placeholder="Describe what this collection contains…"
              />
            </div>

            <div>
              <label className="label">Cover Image <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600 cursor-pointer transition-colors">
                  <ImageIcon className="h-4 w-4" />
                  Choose image
                  <input type="file" className="hidden" onChange={(e) => handleThumbnailChange(e.target.files?.[0] || null)} accept="image/*" />
                </label>
                {thumbnailPreview && (
                  <img src={thumbnailPreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-calm-200 dark:border-slate-600" />
                )}
              </div>
            </div>

            {/* Target organisations */}
            <div>
              <label className="label">Target Organisations <span className="text-slate-400 font-normal">(leave empty for all)</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {orgs.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => toggleOrgId(org.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      formTargetOrgIds.includes(org.id)
                        ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-300'
                        : 'bg-white border-calm-200 text-slate-600 hover:bg-calm-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                    )}
                  >
                    {org.name}
                  </button>
                ))}
                {orgs.length === 0 && <p className="text-xs text-slate-400">No organisations found.</p>}
              </div>
            </div>

            {/* Target roles */}
            <div>
              <label className="label">Target Roles <span className="text-slate-400 font-normal">(leave empty for all)</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleRole(opt.value)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      formTargetRoles.includes(opt.value)
                        ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-300'
                        : 'bg-white border-calm-200 text-slate-600 hover:bg-calm-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-calm-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active (visible to users immediately)</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={formSubmitting} className="btn-primary">
                {formSubmitting ? 'Creating…' : 'Create Collection'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Collection list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-16 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />
            Loading…
          </div>
        ) : collections.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              No collections yet. Create your first one above.
            </p>
          </div>
        ) : (
          collections.map((col) => (
            <div
              key={col.id}
              className="card p-0 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                {/* Thumbnail */}
                {col.thumbnailUrl ? (
                  <div className="w-24 h-24 flex-shrink-0 bg-calm-50 dark:bg-slate-700 overflow-hidden hidden sm:block">
                    <img src={col.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 flex-shrink-0 bg-calm-50 dark:bg-slate-700 items-center justify-center hidden sm:flex">
                    <FolderOpen className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 px-4 py-3 min-w-0">
                  {editingId === col.id ? (
                    <div className="space-y-2">
                      <input
                        className="input w-full text-sm font-semibold"
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Collection name"
                        autoFocus
                      />
                      <textarea
                        className="input w-full text-sm"
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={editSaving || !editTitle.trim() || !editDescription.trim()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          {editSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-calm-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/super-admin/library/${col.id}`}
                          className="font-semibold text-slate-800 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        >
                          {col.title}
                        </Link>
                        <button
                          onClick={(e) => { e.preventDefault(); startEditing(col) }}
                          className="p-1 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex-shrink-0"
                          title="Edit collection name and description"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{col.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {col._count.documents} document{col._count.documents !== 1 ? 's' : ''}
                        </span>
                        <span>·</span>
                        <span>{targetLabel(col)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        disabled={actionLoading === col.id + '-toggle'}
                        onClick={(e) => { e.preventDefault(); toggleActive(col) }}
                        className={clsx(
                          'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                          col.active
                            ? 'bg-sage-100 text-sage-700 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-400'
                            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {col.active ? <><CheckCircle className="h-3 w-3" />Active</> : <><XCircle className="h-3 w-3" />Inactive</>}
                      </button>
                      <button
                        disabled={actionLoading === col.id + '-delete'}
                        onClick={(e) => { e.preventDefault(); handleDelete(col) }}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                        title="Delete collection"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/super-admin/library/${col.id}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        title="Manage documents"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
