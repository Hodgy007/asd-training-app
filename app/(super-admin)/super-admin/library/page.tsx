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
  Image as ImageIcon,
  BarChart3,
  FileText,
  Pencil,
  ExternalLink,
  Globe2,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { HowToPanel } from '@/components/howto/panel'
import LibraryHowTo from '@/components/howto/super-admin/library'

interface Organisation { id: string; name: string }

interface LibraryCollection {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  targetOrgIds: string[]
  targetRoles: string[]
  active: boolean
  publishedToToolkit?: boolean
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
  const [cohorts, setCohorts] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formThumbnail, setFormThumbnail] = useState<File | null>(null)
  const [formTargetOrgIds, setFormTargetOrgIds] = useState<string[]>([])
  const [formTargetRoles, setFormTargetRoles] = useState<string[]>([])
  const [formActive, setFormActive] = useState(true)
  const [formPublishedToToolkit, setFormPublishedToToolkit] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

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
    try { const res = await fetch('/api/super-admin/organisations'); if (res.ok) setOrgs(await res.json()) } catch {}
  }, [])
  const fetchCohorts = useCallback(async () => {
    try { const res = await fetch('/api/super-admin/cohorts'); if (res.ok) setCohorts(await res.json()) } catch {}
  }, [])

  useEffect(() => { fetchCollections(); fetchOrgs(); fetchCohorts() }, [fetchCollections, fetchOrgs, fetchCohorts])

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
    } else setThumbnailPreview(null)
  }

  function toggleOrgId(id: string) { setFormTargetOrgIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) }
  function toggleRole(role: string) { setFormTargetRoles((prev) => prev.includes(role) ? prev.filter((x) => x !== role) : [...prev, role]) }

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
        if (uploadRes.ok) thumbnailUrl = (await uploadRes.json()).url
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
          publishedToToolkit: formPublishedToToolkit,
        }),
      })
      if (res.ok) {
        showToast('Collection created.', 'success')
        setShowForm(false); setFormTitle(''); setFormDescription(''); setFormThumbnail(null); setThumbnailPreview(null); setFormTargetOrgIds([]); setFormTargetRoles([]); setFormActive(true); setFormPublishedToToolkit(false)
        fetchCollections()
      } else showToast((await res.json()).error || 'Create failed.', 'error')
    } catch { showToast('Failed. Please try again.', 'error') } finally { setFormSubmitting(false) }
  }

  async function toggleActive(col: LibraryCollection) {
    setActionLoading(col.id + '-toggle')
    try {
      const res = await fetch(`/api/super-admin/library/${col.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !col.active }) })
      if (res.ok) { showToast(`Collection ${!col.active ? 'activated' : 'deactivated'}.`, 'success'); fetchCollections() }
    } finally { setActionLoading(null) }
  }

  async function togglePublishedToToolkit(col: LibraryCollection) {
    setActionLoading(col.id + '-publish')
    try {
      const res = await fetch(`/api/super-admin/library/${col.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedToToolkit: !col.publishedToToolkit }),
      })
      if (res.ok) {
        showToast(`Collection ${!col.publishedToToolkit ? 'published to' : 'removed from'} Toolkit.`, 'success')
        fetchCollections()
      } else {
        showToast('Publishing update failed.', 'error')
      }
    } catch {
      showToast('Publishing update failed.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(col: LibraryCollection) {
    if (!confirm(`Delete "${col.title}" and all its documents? This cannot be undone.`)) return
    setActionLoading(col.id + '-delete')
    try { const res = await fetch(`/api/super-admin/library/${col.id}`, { method: 'DELETE' }); if (res.ok) { showToast('Collection deleted.', 'success'); fetchCollections() } } finally { setActionLoading(null) }
  }

  function targetLabel(col: LibraryCollection): string {
    if (col.targetOrgIds.length === 0 && col.targetRoles.length === 0) return 'All users'
    const parts: string[] = []
    if (col.targetOrgIds.length > 0) parts.push(col.targetOrgIds.map((id) => orgs.find((o) => o.id === id)?.name || cohorts.find((c) => c.id === id)?.name + ' (cohort)' || id).join(', '))
    if (col.targetRoles.length > 0) parts.push(col.targetRoles.map((r) => ROLE_OPTIONS.find((o) => o.value === r)?.label || r).join(', '))
    return parts.join(' · ')
  }

  function publishStatus(col: LibraryCollection): 'live' | 'awaiting' | 'unpublished' {
    if (!col.publishedToToolkit) return 'unpublished'
    if (col._count.documents === 0) return 'awaiting'
    return 'live'
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
      {toast && <div className={clsx('fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2', toast.type === 'success' ? 'bg-sage-600 text-white' : 'bg-red-600 text-white')}>{toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{toast.message}</div>}
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />Document Library</h1><p className="text-slate-500 dark:text-slate-400 mt-1">Create collections of documents and target them to specific organisations or roles.</p></div><div className="flex items-center gap-2"><Link href="/super-admin/reports/library" className="flex items-center gap-2 px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"><BarChart3 className="h-4 w-4" />Reports</Link><button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">{showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showForm ? 'Cancel' : 'New Collection'}</button></div></div>
      {showForm && <div className="card space-y-4"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Collection</h2><form onSubmit={handleCreate} className="space-y-4"><div><label className="label">Title</label><input className="input w-full" type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required placeholder="e.g. Safeguarding Policies" /></div><div><label className="label">Description</label><textarea className="input w-full min-h-[80px] resize-y" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} required placeholder="Describe what this collection contains…" /></div><div><label className="label">Cover Image <span className="text-slate-400 font-normal">(optional)</span></label><div className="flex items-center gap-3"><label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600 cursor-pointer transition-colors"><ImageIcon className="h-4 w-4" />Choose image<input type="file" className="hidden" onChange={(e) => handleThumbnailChange(e.target.files?.[0] || null)} accept="image/*" /></label>{thumbnailPreview && <img src={thumbnailPreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-calm-200 dark:border-slate-600" />}</div></div><div><label className="label">Target Organisations <span className="text-slate-400 font-normal">(leave empty for all)</span></label><div className="flex flex-wrap gap-2 mt-1">{orgs.map((org) => <button key={org.id} type="button" onClick={() => toggleOrgId(org.id)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors', formTargetOrgIds.includes(org.id) ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-300' : 'bg-white border-calm-200 text-slate-600 hover:bg-calm-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600')}>{org.name}</button>)}</div></div><div><label className="label">Target Roles <span className="text-slate-400 font-normal">(leave empty for all)</span></label><div className="flex flex-wrap gap-2 mt-1">{ROLE_OPTIONS.map((opt) => <button key={opt.value} type="button" onClick={() => toggleRole(opt.value)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors', formTargetRoles.includes(opt.value) ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-300' : 'bg-white border-calm-200 text-slate-600 hover:bg-calm-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600')}>{opt.label}</button>)}</div></div><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-calm-300 text-primary-600 focus:ring-primary-500" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active (available internally)</span></label><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formPublishedToToolkit} onChange={(e) => setFormPublishedToToolkit(e.target.checked)} className="rounded border-calm-300 text-primary-600 focus:ring-primary-500" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Publish to Toolkit</span></label><div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700">Cancel</button><button type="submit" disabled={formSubmitting} className="btn-primary">{formSubmitting ? 'Creating…' : 'Create Collection'}</button></div></form></div>}

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />Loading…
        </div>
      ) : editingId ? (
        // Inline edit panel above the grid
        <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit collection</h2>
          <input className="input w-full text-sm font-semibold" type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Collection name" autoFocus />
          <textarea className="input w-full text-sm" rows={3} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" />
          <div className="flex gap-2">
            <button onClick={handleSaveEdit} disabled={editSaving || !editTitle.trim() || !editDescription.trim()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              <CheckCircle className="h-3.5 w-3.5" />{editSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditingId(null)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-calm-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          </div>
        </div>
      ) : null}

      {!loading && collections.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">No collections yet. Create your first one above.</p>
        </div>
      ) : !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((col) => {
            const status = publishStatus(col)
            return (
              <div
                key={col.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg transition-all"
              >
                {/* Cover */}
                <Link href={`/super-admin/library/${col.id}`} className="block">
                  {col.thumbnailUrl ? (
                    <div className="aspect-[16/9] w-full overflow-hidden bg-calm-50 dark:bg-slate-700">
                      <img src={col.thumbnailUrl} alt="" className="w-full h-full object-cover transition duration-300 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] w-full bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-900/10 flex items-center justify-center">
                      <FolderOpen className="h-12 w-12 text-primary-400 dark:text-primary-500" />
                    </div>
                  )}
                </Link>

                {/* Status pills overlay */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {col.active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-sage-700 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-sage-400">
                      <CheckCircle className="h-3 w-3" />Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-xs font-semibold text-red-700 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-red-400">
                      <XCircle className="h-3 w-3" />Inactive
                    </span>
                  )}
                  {status === 'live' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sage-600 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                      <Globe2 className="h-3 w-3" />Live on Toolkit
                    </span>
                  )}
                  {status === 'awaiting' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
                      <AlertCircle className="h-3 w-3" />Awaiting documents
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/super-admin/library/${col.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-1">
                        {col.title}
                      </h3>
                    </Link>
                    <button onClick={(e) => { e.preventDefault(); startEditing(col) }} className="p-1 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex-shrink-0" title="Edit collection name and description">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{col.description}</p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{col._count.documents} document{col._count.documents !== 1 ? 's' : ''}</span>
                    <span aria-hidden="true">·</span>
                    <span className="line-clamp-1">{targetLabel(col)}</span>
                  </div>

                  {status === 'awaiting' && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                      Add at least one document and it will go live on the public Toolkit.
                    </p>
                  )}

                  {/* Actions */}
                  <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
                    <button
                      disabled={actionLoading === col.id + '-publish'}
                      onClick={(e) => { e.preventDefault(); togglePublishedToToolkit(col) }}
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50',
                        col.publishedToToolkit
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200',
                      )}
                    >
                      <Globe2 className="h-3 w-3" />{col.publishedToToolkit ? 'Unpublish' : 'Publish'}
                    </button>

                    <button
                      disabled={actionLoading === col.id + '-toggle'}
                      onClick={(e) => { e.preventDefault(); toggleActive(col) }}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
                    >
                      {col.active ? 'Deactivate' : 'Activate'}
                    </button>

                    {status === 'live' ? (
                      <Link
                        href={`/toolkit/${col.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 transition-colors"
                        title="Preview on the public Toolkit"
                      >
                        Preview<ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span
                        className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                        title={status === 'awaiting' ? 'Add a document first' : 'Publish to enable preview'}
                      >
                        Preview<ExternalLink className="h-3 w-3" />
                      </span>
                    )}

                    <button
                      disabled={actionLoading === col.id + '-delete'}
                      onClick={(e) => { e.preventDefault(); handleDelete(col) }}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                      title="Delete collection"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <HowToPanel><LibraryHowTo /></HowToPanel>
    </div>
  )
}
