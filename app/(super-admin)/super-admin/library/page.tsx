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
  FileText,
  Image as ImageIcon,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

interface Organisation {
  id: string
  name: string
}

interface LibraryDoc {
  id: string
  title: string
  description: string
  fileUrl: string
  fileName: string
  fileSize: number
  fileType: string
  thumbnailUrl: string | null
  targetOrgIds: string[]
  targetRoles: string[]
  active: boolean
  createdAt: string
  uploadedBy: { name: string | null }
}

const ROLE_OPTIONS = [
  { value: 'CAREGIVER', label: 'Practitioner' },
  { value: 'CAREER_DEV_OFFICER', label: 'Careers Professional' },
  { value: 'STUDENT', label: 'Student' },
  { value: 'INTERN', label: 'Intern' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'ORG_ADMIN', label: 'Org Admin' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LibraryPage() {
  const [documents, setDocuments] = useState<LibraryDoc[]>([])
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formThumbnail, setFormThumbnail] = useState<File | null>(null)
  const [formTargetOrgIds, setFormTargetOrgIds] = useState<string[]>([])
  const [formTargetRoles, setFormTargetRoles] = useState<string[]>([])
  const [formActive, setFormActive] = useState(true)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/library')
      if (res.ok) setDocuments(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch('/api/super-admin/organisations')
      if (res.ok) {
        const data = await res.json()
        setOrgs(data)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
    fetchOrgs()
  }, [fetchDocuments, fetchOrgs])

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
    setFormTargetOrgIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleRole(role: string) {
    setFormTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((x) => x !== role) : [...prev, role]
    )
  }

  async function uploadFile(file: File, folder: string): Promise<{ url: string; fileName: string; size: number }> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', folder)
    const res = await fetch('/api/super-admin/library/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formFile) {
      showToast('Please select a file to upload.', 'error')
      return
    }
    setFormSubmitting(true)
    try {
      // Upload file
      const fileResult = await uploadFile(formFile, 'library/documents')

      // Upload thumbnail if provided
      let thumbnailUrl: string | null = null
      if (formThumbnail) {
        const thumbResult = await uploadFile(formThumbnail, 'library/thumbnails')
        thumbnailUrl = thumbResult.url
      }

      // Create document record
      const res = await fetch('/api/super-admin/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          fileUrl: fileResult.url,
          fileName: fileResult.fileName,
          fileSize: fileResult.size,
          fileType: formFile.type,
          thumbnailUrl,
          targetOrgIds: formTargetOrgIds,
          targetRoles: formTargetRoles,
          active: formActive,
        }),
      })

      if (res.ok) {
        showToast('Document uploaded successfully.', 'success')
        setShowForm(false)
        setFormTitle('')
        setFormDescription('')
        setFormFile(null)
        setFormThumbnail(null)
        setThumbnailPreview(null)
        setFormTargetOrgIds([])
        setFormTargetRoles([])
        setFormActive(true)
        fetchDocuments()
      } else {
        const d = await res.json()
        showToast(d.error || 'Create failed.', 'error')
      }
    } catch {
      showToast('Upload failed. Please try again.', 'error')
    } finally {
      setFormSubmitting(false)
    }
  }

  async function toggleActive(doc: LibraryDoc) {
    setActionLoading(doc.id + '-toggle')
    try {
      const res = await fetch(`/api/super-admin/library/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !doc.active }),
      })
      if (res.ok) {
        showToast(`Document ${!doc.active ? 'activated' : 'deactivated'}.`, 'success')
        fetchDocuments()
      } else {
        const d = await res.json()
        showToast(d.error || 'Update failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(doc: LibraryDoc) {
    if (!confirm(`Delete "${doc.title}"? This will also delete the uploaded file.`)) return
    setActionLoading(doc.id + '-delete')
    try {
      const res = await fetch(`/api/super-admin/library/${doc.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Document deleted.', 'success')
        fetchDocuments()
      } else {
        const d = await res.json()
        showToast(d.error || 'Delete failed.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  function targetLabel(doc: LibraryDoc): string {
    const parts: string[] = []
    if (doc.targetOrgIds.length === 0 && doc.targetRoles.length === 0) return 'All users'
    if (doc.targetOrgIds.length > 0) {
      const orgNames = doc.targetOrgIds.map((id) => orgs.find((o) => o.id === id)?.name || id)
      parts.push(orgNames.join(', '))
    }
    if (doc.targetRoles.length > 0) {
      const roleNames = doc.targetRoles.map((r) => ROLE_OPTIONS.find((o) => o.value === r)?.label || r)
      parts.push(roleNames.join(', '))
    }
    return parts.join(' · ')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={clsx(
            'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2',
            toast.type === 'success' ? 'bg-sage-600 text-white' : 'bg-red-600 text-white'
          )}
        >
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
          <p className="text-slate-500 dark:text-slate-400 mt-1">Upload documents for users to download. Target by organisation and role.</p>
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
            {showForm ? 'Cancel' : 'Upload Document'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New Document</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                className="input w-full"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                placeholder="e.g. ASD Awareness Handbook"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input w-full min-h-[80px] resize-y"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                required
                placeholder="Brief description of this document…"
              />
            </div>

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

            <div>
              <label className="label">Thumbnail <span className="text-slate-400 font-normal">(optional)</span></label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600 cursor-pointer transition-colors">
                  <ImageIcon className="h-4 w-4" />
                  Choose image
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleThumbnailChange(e.target.files?.[0] || null)}
                    accept="image/*"
                  />
                </label>
                {thumbnailPreview && (
                  <img src={thumbnailPreview} alt="Thumbnail preview" className="h-12 w-12 rounded-lg object-cover border border-calm-200 dark:border-slate-600" />
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
                {orgs.length === 0 && (
                  <p className="text-xs text-slate-400">No organisations found.</p>
                )}
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
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded border-calm-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active (visible to users immediately)</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button type="submit" disabled={formSubmitting} className="btn-primary">
                {formSubmitting ? 'Uploading…' : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-calm-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={fetchDocuments}
            className="p-2 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
            title="Refresh"
          >
            <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Document</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Active</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden md:table-cell">Target</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden lg:table-cell">Size</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 hidden lg:table-cell">Uploaded</th>
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    Loading…
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No documents yet. Upload your first document above.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-calm-100 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {doc.thumbnailUrl ? (
                          <img src={doc.thumbnailUrl} alt="" className="h-10 w-10 rounded-lg object-cover border border-calm-200 dark:border-slate-600 flex-shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-calm-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{doc.title}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{doc.fileName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={actionLoading === doc.id + '-toggle'}
                        onClick={() => toggleActive(doc)}
                        className={clsx(
                          'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                          doc.active
                            ? 'bg-sage-100 text-sage-700 hover:bg-sage-200 dark:bg-sage-900/30 dark:text-sage-400'
                            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {doc.active ? (
                          <><CheckCircle className="h-3 w-3" />Active</>
                        ) : (
                          <><XCircle className="h-3 w-3" />Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden md:table-cell max-w-[200px] truncate">
                      {targetLabel(doc)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                      {formatFileSize(doc.fileSize)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 hidden lg:table-cell">
                      {new Date(doc.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        disabled={actionLoading === doc.id + '-delete'}
                        onClick={() => handleDelete(doc)}
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
