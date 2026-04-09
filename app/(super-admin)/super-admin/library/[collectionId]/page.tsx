'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'
import {
  ArrowLeft,
  FolderOpen,
  Plus,
  ChevronUp,
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Pencil,
  X,
  Sparkles,
  Image as ImageIcon,
  Eye,
  EyeOff,
} from 'lucide-react'

interface LibraryDoc {
  id: string
  title: string
  description: string
  fileUrl: string
  fileName: string
  fileSize: number
  fileType: string
  thumbnailUrl: string | null
  active: boolean
  createdAt: string
  uploadedBy: { name: string | null }
  _count: { events: number }
}

interface Collection {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  targetOrgIds: string[]
  targetRoles: string[]
  active: boolean
  documents: LibraryDoc[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Add form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formThumbnailUrl, setFormThumbnailUrl] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  // Edit state (documents)
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Edit state (collection)
  const [editingCollection, setEditingCollection] = useState(false)
  const [colEditTitle, setColEditTitle] = useState('')
  const [colEditDescription, setColEditDescription] = useState('')
  const [colEditSaving, setColEditSaving] = useState(false)

  const fetchCollection = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}`)
      if (res.ok) setCollection(await res.json())
    } finally {
      setLoading(false)
    }
  }, [collectionId])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function startEditCollection() {
    if (!collection) return
    setColEditTitle(collection.title)
    setColEditDescription(collection.description)
    setEditingCollection(true)
  }

  async function handleSaveCollection() {
    setColEditSaving(true)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: colEditTitle, description: colEditDescription }),
      })
      if (res.ok) {
        showToast('Collection updated.', 'success')
        setEditingCollection(false)
        fetchCollection()
      } else {
        const d = await res.json()
        showToast(d.error || 'Save failed.', 'error')
      }
    } finally {
      setColEditSaving(false)
    }
  }

  function resetForm() {
    setFormTitle('')
    setFormDescription('')
    setFormFile(null)
    setFormThumbnailUrl(null)
  }

  // AI generate title, description, and optionally thumbnail from filename
  async function handleAiGenerate(generateImage: boolean) {
    if (!formFile) {
      showToast('Please select a file first.', 'error')
      return
    }
    setAiGenerating(true)
    try {
      const res = await fetch('/api/super-admin/library/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: formFile.name,
          collectionTitle: collection?.title,
          generateImage,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (!generateImage) {
          // Text only — update title and description
          if (data.title) setFormTitle(data.title)
          if (data.description) setFormDescription(data.description)
        }
        if (data.thumbnailUrl) setFormThumbnailUrl(data.thumbnailUrl)
        if (generateImage && !data.thumbnailUrl) {
          showToast(data.imageError || 'AI image generation failed.', 'error')
        } else {
          showToast(generateImage ? 'AI image generated.' : 'AI generated title and description.', 'success')
        }
      } else {
        showToast('AI generation failed.', 'error')
      }
    } catch {
      showToast('AI generation failed.', 'error')
    } finally {
      setAiGenerating(false)
    }
  }

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!formFile) {
      showToast('Please select a file.', 'error')
      return
    }
    setFormSubmitting(true)
    try {
      // Upload file
      const fd = new FormData()
      fd.append('file', formFile)
      fd.append('folder', 'library/documents')
      const uploadRes = await fetch('/api/super-admin/library/upload', { method: 'POST', body: fd })
      if (!uploadRes.ok) throw new Error('Upload failed')
      const fileData = await uploadRes.json()

      // Create document record
      const res = await fetch(`/api/super-admin/library/${collectionId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          fileUrl: fileData.url,
          fileName: fileData.fileName,
          fileSize: fileData.size,
          fileType: formFile.type,
          thumbnailUrl: formThumbnailUrl,
        }),
      })

      if (res.ok) {
        showToast('Document added.', 'success')
        setShowForm(false)
        resetForm()
        fetchCollection()
      } else {
        const d = await res.json()
        showToast(d.error || 'Failed to add document.', 'error')
      }
    } catch {
      showToast('Upload failed. Please try again.', 'error')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleToggleActive(doc: LibraryDoc) {
    setActionLoading(doc.id + '-toggle')
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !doc.active }),
      })
      if (res.ok) {
        showToast(`Document ${!doc.active ? 'activated' : 'deactivated'}.`, 'success')
        fetchCollection()
      }
    } finally {
      setActionLoading(null)
    }
  }

  function startEdit(doc: LibraryDoc) {
    setEditingDoc(doc.id)
    setEditTitle(doc.title)
    setEditDescription(doc.description)
  }

  function cancelEdit() {
    setEditingDoc(null)
    setEditTitle('')
    setEditDescription('')
  }

  async function handleSaveEdit(doc: LibraryDoc) {
    setEditSaving(true)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, description: editDescription }),
      })
      if (res.ok) {
        showToast('Document updated.', 'success')
        setEditingDoc(null)
        fetchCollection()
      } else {
        showToast('Failed to update.', 'error')
      }
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteDoc(doc: LibraryDoc) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    setActionLoading(doc.id + '-delete')
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/documents/${doc.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Document deleted.', 'success')
        fetchCollection()
      }
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16 text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />
        Loading collection…
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
        <FolderOpen className="h-12 w-12 mx-auto mb-3 text-slate-300" />
        <p className="text-slate-500 font-medium">Collection not found.</p>
        <Link href="/super-admin/library" className="text-primary-600 text-sm mt-2 hover:underline">
          Back to library
        </Link>
      </div>
    )
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/super-admin/library" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            {editingCollection ? (
              <div className="flex-1 space-y-3">
                <div>
                  <label className="label">Collection Name</label>
                  <input
                    className="input w-full text-lg font-bold"
                    type="text"
                    value={colEditTitle}
                    onChange={(e) => setColEditTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input w-full"
                    rows={2}
                    value={colEditDescription}
                    onChange={(e) => setColEditDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCollection}
                    disabled={colEditSaving || !colEditTitle.trim() || !colEditDescription.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {colEditSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingCollection(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    {collection.title}
                  </h1>
                  <button
                    onClick={startEditCollection}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex-shrink-0"
                    title="Edit collection name and description"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{collection.description}</p>
              </div>
            )}
          </div>
        </div>
        {!editingCollection && (
          <button
            onClick={() => { setShowForm((v) => !v); if (showForm) resetForm() }}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'Add Document'}
          </button>
        )}
      </div>

      {/* Add document form */}
      {showForm && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add Document</h2>
          <form onSubmit={handleAddDocument} className="space-y-4">
            {/* File first — AI generate needs filename */}
            <div>
              <label className="label">File</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600 cursor-pointer transition-colors">
                  <Upload className="h-4 w-4" />
                  Choose file
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.png,.jpg,.jpeg"
                  />
                </label>
                {formFile && (
                  <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {formFile.name} ({formatFileSize(formFile.size)})
                  </span>
                )}
              </div>
            </div>

            {/* AI generate buttons — only show when file is selected */}
            {formFile && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />
                <span className="text-sm text-purple-700 dark:text-purple-300 font-medium mr-2">AI Assist:</span>
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={() => handleAiGenerate(false)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-colors disabled:opacity-40"
                >
                  {aiGenerating ? 'Generating…' : 'Generate Title & Description'}
                </button>
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={() => handleAiGenerate(true)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/60 transition-colors disabled:opacity-40"
                >
                  <ImageIcon className="h-3 w-3 inline mr-1" />
                  {aiGenerating ? 'Generating…' : 'Generate AI Image'}
                </button>
              </div>
            )}

            <div>
              <label className="label">Title</label>
              <input
                className="input w-full"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                placeholder="e.g. Safeguarding Policy v3"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input w-full min-h-[60px] resize-y"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                required
                placeholder="Brief description…"
              />
            </div>

            {/* Thumbnail — manual upload or AI-generated */}
            <div>
              <label className="label">Thumbnail Image (optional)</label>
              {formThumbnailUrl ? (
                <div className="flex items-start gap-3">
                  <img
                    src={formThumbnailUrl}
                    alt="Thumbnail preview"
                    className="h-24 w-24 rounded-xl object-cover border border-calm-200 dark:border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setZoomedImage(formThumbnailUrl)}
                  />
                  <button
                    type="button"
                    onClick={() => setFormThumbnailUrl(null)}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove image
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600 cursor-pointer transition-colors">
                    <ImageIcon className="h-4 w-4" />
                    Upload thumbnail
                    <input
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={async (e) => {
                        const imgFile = e.target.files?.[0]
                        if (!imgFile) return
                        try {
                          const fd = new FormData()
                          fd.append('file', imgFile)
                          fd.append('folder', 'library/thumbnails')
                          const res = await fetch('/api/super-admin/library/upload', { method: 'POST', body: fd })
                          if (res.ok) {
                            const data = await res.json()
                            setFormThumbnailUrl(data.url)
                          } else {
                            showToast('Thumbnail upload failed.', 'error')
                          }
                        } catch {
                          showToast('Thumbnail upload failed.', 'error')
                        }
                      }}
                    />
                  </label>
                  <span className="text-xs text-slate-400 dark:text-slate-500">PNG, JPG or WebP — or use AI Assist above</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={formSubmitting} className="btn-primary">
                {formSubmitting ? 'Uploading…' : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Documents list */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {collection.documents.length} document{collection.documents.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={fetchCollection}
            className="p-2 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>

        {collection.documents.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No documents in this collection yet.
          </div>
        ) : (
          <div className="divide-y divide-calm-100 dark:divide-slate-700">
            {collection.documents.map((doc) => {
              const isEditing = editingDoc === doc.id

              if (isEditing) {
                return (
                  <div key={doc.id} className="px-4 py-4 bg-calm-50 dark:bg-slate-800/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Editing Document</p>
                      <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Title</label>
                      <input
                        className="input w-full text-sm"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Description</label>
                      <textarea
                        className="input w-full text-sm min-h-[50px] resize-y"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg border border-calm-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-100 dark:hover:bg-slate-700">
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(doc)}
                        disabled={editSaving || !editTitle.trim()}
                        className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-bold hover:bg-primary-600 disabled:opacity-40 transition-colors"
                      >
                        {editSaving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={doc.id}
                  className={clsx(
                    'flex items-center gap-4 px-4 py-3 transition-colors',
                    doc.active
                      ? 'hover:bg-calm-50 dark:hover:bg-slate-800/50'
                      : 'bg-slate-50 dark:bg-slate-800/30 opacity-60'
                  )}
                >
                  {/* Thumbnail or icon */}
                  {doc.thumbnailUrl ? (
                    <div
                      className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 border border-calm-200 dark:border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setZoomedImage(doc.thumbnailUrl)}
                    >
                      <img src={doc.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-calm-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{doc.title}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">{doc.description}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {doc.fileName} · {formatFileSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Active/Inactive toggle */}
                    <button
                      disabled={actionLoading === doc.id + '-toggle'}
                      onClick={() => handleToggleActive(doc)}
                      className={clsx(
                        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                        doc.active
                          ? 'bg-sage-100 text-sage-700 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-400'
                          : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                      )}
                      title={doc.active ? 'Deactivate' : 'Activate'}
                    >
                      {doc.active ? <><Eye className="h-3 w-3" />Active</> : <><EyeOff className="h-3 w-3" />Inactive</>}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => startEdit(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                      title="Edit document"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* Preview */}
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Preview file"
                    >
                      <FileText className="h-4 w-4" />
                    </a>

                    {/* Delete */}
                    <button
                      disabled={actionLoading === doc.id + '-delete'}
                      onClick={() => handleDeleteDoc(doc)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Image zoom lightbox */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 cursor-pointer"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[80vh] mx-4">
            <img
              src={zoomedImage}
              alt="Zoomed thumbnail"
              className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white dark:bg-slate-700 shadow-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
