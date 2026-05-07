'use client'

import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { upload } from '@vercel/blob/client'
import {
  FolderOpen,
  Plus,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronUp,
  Trash2,
  Image as ImageIcon,
  FileText,
  Pencil,
  ExternalLink,
  Globe2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { HowToPanel } from '@/components/howto/panel'
import LibraryHowTo from '@/components/howto/super-admin/library'
import { CollectionActionsPanel } from '@/components/super-admin/library/collection-actions-panel'
import { CollectionThemePicker } from '@/components/super-admin/library/collection-theme-picker'

interface Organisation { id: string; name: string }

interface LibraryCollection {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  themeKey: string | null
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
  { value: 'FAMILY_CARER', label: 'Parent/Friend/Relative/Carer' },
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
  // AI Assist for the create-collection form. Without docs to anchor we
  // need a topic seed. The handler can chain a thumbnail off the AI
  // description; we surface it via a Blob URL preview in `thumbnailPreview`.
  const [aiNewTopic, setAiNewTopic] = useState('')
  const [aiNewGenerating, setAiNewGenerating] = useState<null | 'text' | 'image'>(null)
  const [aiNewThumbnailUrl, setAiNewThumbnailUrl] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editThemeKey, setEditThemeKey] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  function startEditing(col: LibraryCollection) {
    setEditingId(col.id)
    setEditTitle(col.title)
    setEditDescription(col.description)
    setEditThemeKey(col.themeKey ?? null)
  }

  async function handleSaveEdit() {
    if (!editingId) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/super-admin/library/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          themeKey: editThemeKey,
        }),
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
      // Manual upload wins if both a file AND an AI thumbnail are present;
      // otherwise the AI-generated Blob URL is used as-is.
      let thumbnailUrl: string | null = aiNewThumbnailUrl
      if (formThumbnail) {
        const blob = await upload(`library/thumbnails/${formThumbnail.name}`, formThumbnail, {
          access: 'public',
          handleUploadUrl: '/api/super-admin/library/upload/upload-url',
        })
        thumbnailUrl = blob.url
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
        setShowForm(false); setFormTitle(''); setFormDescription(''); setFormThumbnail(null); setThumbnailPreview(null); setAiNewThumbnailUrl(null); setAiNewTopic(''); setFormTargetOrgIds([]); setFormTargetRoles([]); setFormActive(true); setFormPublishedToToolkit(false)
        fetchCollections()
      } else showToast((await res.json()).error || 'Create failed.', 'error')
    } catch { showToast('Failed. Please try again.', 'error') } finally { setFormSubmitting(false) }
  }

  // AI Assist for the create form. There are no documents yet so the topic
  // seed drives generation; thumbnail is chained off the AI description.
  async function handleAiGenerateNewCollection(includeImage: boolean) {
    const seed = aiNewTopic.trim()
    if (!seed) {
      showToast('Add a topic seed first (e.g. "autistic young people in the workplace").', 'error')
      return
    }
    setAiNewGenerating(includeImage ? 'image' : 'text')
    try {
      const res = await fetch('/api/super-admin/library/generate-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicSeed: seed,
          currentTitle: formTitle.trim() || undefined,
          currentDescription: formDescription.trim() || undefined,
          generateImage: includeImage,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        showToast(j?.error ?? 'AI generation failed.', 'error')
        return
      }
      const j = await res.json() as { title: string; description: string; thumbnailUrl: string | null; imageError?: string; source: string }
      setFormTitle(j.title)
      setFormDescription(j.description)
      if (includeImage && j.thumbnailUrl) {
        setAiNewThumbnailUrl(j.thumbnailUrl)
        setThumbnailPreview(j.thumbnailUrl)
        setFormThumbnail(null)
      }
      if (includeImage && !j.thumbnailUrl) {
        showToast(j.imageError ? 'Thumbnail generation failed.' : 'Thumbnail not returned.', 'error')
      } else {
        showToast(j.source === 'ai' ? 'AI suggestions applied.' : 'Used fallback (no AI prompt configured).', 'success')
      }
    } catch {
      showToast('AI generation failed.', 'error')
    } finally {
      setAiNewGenerating(null)
    }
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
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"><FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />Document Library</h1><p className="text-slate-500 dark:text-slate-400 mt-1">Create collections of documents and target them to specific organisations or roles.</p></div><div className="flex items-center gap-2"><button onClick={() => setShowForm((v) => !v)} className="btn-primary flex items-center gap-2">{showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{showForm ? 'Cancel' : 'New Collection'}</button></div></div>
      {showForm && <div className="card space-y-4"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Collection</h2><form onSubmit={handleCreate} className="space-y-4"><div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800"><Sparkles className="h-4 w-4 text-primary-500 flex-shrink-0" /><span className="text-xs text-primary-700 dark:text-primary-300 font-medium mr-1">AI Assist:</span><input type="text" placeholder="Topic seed (e.g. autistic young people in the workplace)" value={aiNewTopic} onChange={(e) => setAiNewTopic(e.target.value)} className="flex-1 min-w-[12rem] text-xs rounded-md border border-primary-200 dark:border-primary-800 bg-white dark:bg-slate-700 px-2 py-1" /><button type="button" disabled={aiNewGenerating !== null || !aiNewTopic.trim()} onClick={() => handleAiGenerateNewCollection(false)} className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 transition-colors disabled:opacity-40">{aiNewGenerating === 'text' ? 'Generating…' : 'Generate title + description'}</button><button type="button" disabled={aiNewGenerating !== null || !aiNewTopic.trim()} onClick={() => handleAiGenerateNewCollection(true)} className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 transition-colors disabled:opacity-40"><ImageIcon className="h-3 w-3 inline mr-1" />{aiNewGenerating === 'image' ? 'Generating…' : 'Generate with thumbnail'}</button></div><div><label className="label">Title</label><input className="input w-full" type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required placeholder="e.g. Safeguarding Policies" /></div><div><label className="label">Description</label><textarea className="input w-full min-h-[80px] resize-y" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} required placeholder="Describe what this collection contains…" /></div><div><label className="label">Cover Image <span className="text-slate-400 font-normal">(optional)</span></label><div className="flex items-center gap-3"><label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600 cursor-pointer transition-colors"><ImageIcon className="h-4 w-4" />Choose image<input type="file" className="hidden" onChange={(e) => handleThumbnailChange(e.target.files?.[0] || null)} accept="image/*" /></label>{thumbnailPreview && <img src={thumbnailPreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-calm-200 dark:border-slate-600" />}</div></div><div><label className="label">Target Organisations <span className="text-slate-400 font-normal">(leave empty for all)</span></label><div className="flex flex-wrap gap-2 mt-1">{orgs.map((org) => <button key={org.id} type="button" onClick={() => toggleOrgId(org.id)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors', formTargetOrgIds.includes(org.id) ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-300' : 'bg-white border-calm-200 text-slate-600 hover:bg-calm-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600')}>{org.name}</button>)}</div></div><div><label className="label">Target Roles <span className="text-slate-400 font-normal">(leave empty for all)</span></label><div className="flex flex-wrap gap-2 mt-1">{ROLE_OPTIONS.map((opt) => <button key={opt.value} type="button" onClick={() => toggleRole(opt.value)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors', formTargetRoles.includes(opt.value) ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-300' : 'bg-white border-calm-200 text-slate-600 hover:bg-calm-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-600')}>{opt.label}</button>)}</div></div><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="rounded border-calm-300 text-primary-600 focus:ring-primary-500" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active (available internally)</span></label><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formPublishedToToolkit} onChange={(e) => setFormPublishedToToolkit(e.target.checked)} className="rounded border-calm-300 text-primary-600 focus:ring-primary-500" /><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Publish to Toolkit</span></label><div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700">Cancel</button><button type="submit" disabled={formSubmitting} className="btn-primary">{formSubmitting ? 'Creating…' : 'Create Collection'}</button></div></form></div>}

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />Loading…
        </div>
      ) : editingId ? (
        // Inline edit panel above the grid — same fields & actions as the
        // detail-page edit form so admins get a consistent experience whichever
        // pencil they click.
        (() => {
          const editingCollection = collections.find((c) => c.id === editingId)
          if (!editingCollection) return null
          return (
            <div className="card space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Edit collection</h2>
              <div>
                <label className="label">Collection name</label>
                <input
                  className="input w-full text-sm font-semibold"
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Collection name"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input w-full text-sm"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                />
              </div>

              <CollectionThemePicker value={editThemeKey} onChange={setEditThemeKey} />

              <div className="border-t border-calm-200 dark:border-slate-700 pt-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Actions
                </p>
                <CollectionActionsPanel
                  collectionId={editingCollection.id}
                  active={editingCollection.active}
                  publishedToToolkit={Boolean(editingCollection.publishedToToolkit)}
                  documentCount={editingCollection._count.documents}
                  onUpdate={fetchCollections}
                  onAfterDelete={() => { setEditingId(null); fetchCollections() }}
                  onToast={showToast}
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-calm-200 dark:border-slate-700">
                <button
                  onClick={handleSaveEdit}
                  disabled={editSaving || !editTitle.trim() || !editDescription.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {editSaving ? 'Saving...' : 'Save collection'}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )
        })()
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

                  {/* Actions — only Preview as learner here. Everything else
                      (Publish, Activate, Delete, Upload ZIP, Clear all) lives
                      in the edit form (click the pencil) so the tile stays
                      uncluttered and reads as a status card. */}
                  <div className="mt-auto pt-4 flex items-center justify-end">
                    <Link
                      href={`/library?c=${col.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors"
                      title="Preview as a learner sees it"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Preview as learner<ExternalLink className="h-3 w-3" />
                    </Link>
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
