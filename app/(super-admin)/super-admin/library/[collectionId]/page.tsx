'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'
import { upload } from '@vercel/blob/client'
import JSZip from 'jszip'
import { ALLOWED_EXTENSIONS, BLOCKED_EXTENSIONS } from '@/lib/upload-validation'
import { CollectionActionsPanel } from '@/components/super-admin/library/collection-actions-panel'
import { CollectionThemePicker } from '@/components/super-admin/library/collection-theme-picker'
import { SectionsManager } from '@/components/super-admin/library/sections-manager'
import { BrandAssetPicker } from '@/components/super-admin/library/brand-asset-picker'
import { ImageLightbox } from '@/components/ui/image-lightbox'
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
  Archive,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Globe2,
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
  videoUrl: string | null
  active: boolean
  sectionId: string | null
  order: number
  createdAt: string
  uploadedBy: { name: string | null }
  _count: { events: number }
}

interface LibrarySectionLite {
  id: string
  title: string
  description: string | null
  order: number
  _count?: { documents: number }
}

interface Collection {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  themeKey: string | null
  targetOrgIds: string[]
  targetRoles: string[]
  active: boolean
  publishedToToolkit: boolean
  documents: LibraryDoc[]
  sections: LibrarySectionLite[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function CollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const router = useRouter()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Add form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formThumbnailUrl, setFormThumbnailUrl] = useState<string | null>(null)
  const [formVideoUrl, setFormVideoUrl] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  // Edit state (documents)
  const [editingDoc, setEditingDoc] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editVideoUrl, setEditVideoUrl] = useState('')
  const [editThumbnailUrl, setEditThumbnailUrl] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editAiGenerating, setEditAiGenerating] = useState(false)

  // ZIP upload state
  const [zipUploading, setZipUploading] = useState(false)
  const [zipProgress, setZipProgress] = useState<number | null>(null)
  const [zipStatusText, setZipStatusText] = useState<string | null>(null)
  const [clearingDocs, setClearingDocs] = useState(false)
  const [zipResults, setZipResults] = useState<{
    created: number
    errors: { fileName: string; error: string }[]
    total: number
  } | null>(null)
  const [zipErrorsExpanded, setZipErrorsExpanded] = useState(false)

  // Edit state (collection)
  const [editingCollection, setEditingCollection] = useState(false)
  const [colEditTitle, setColEditTitle] = useState('')
  const [colEditDescription, setColEditDescription] = useState('')
  const [colEditThemeKey, setColEditThemeKey] = useState<string | null>(null)
  const [colEditThumbnailUrl, setColEditThumbnailUrl] = useState<string | null>(null)
  const [colEditSaving, setColEditSaving] = useState(false)
  // AI Assist for collection metadata (title + description from documents,
  // optional thumbnail generated from the resulting description).
  const [aiCollectionTopic, setAiCollectionTopic] = useState('')
  const [aiCollectionGenerating, setAiCollectionGenerating] = useState<null | 'text' | 'image'>(null)
  const [aiUseBrandStore, setAiUseBrandStore] = useState(true)

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
    setColEditThemeKey(collection.themeKey)
    setColEditThumbnailUrl(collection.thumbnailUrl ?? null)
    setAiCollectionTopic('')
    setEditingCollection(true)
  }

  // AI Assist: generate title + description from the documents already in
  // this collection (or from a topic seed). includeImage chains a thumbnail
  // generation FROM the resulting description so the artwork matches.
  async function handleAiGenerateCollection(includeImage: boolean) {
    if (!collection) return
    setAiCollectionGenerating(includeImage ? 'image' : 'text')
    try {
      const res = await fetch('/api/super-admin/library/generate-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: collection.id,
          topicSeed: aiCollectionTopic.trim() || undefined,
          currentTitle: colEditTitle.trim() || undefined,
          currentDescription: colEditDescription.trim() || undefined,
          generateImage: includeImage,
          useBrandStore: aiUseBrandStore,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        showToast(j?.error ?? 'AI generation failed.', 'error')
        return
      }
      const j = await res.json() as { title: string; description: string; thumbnailUrl: string | null; imageError?: string; source: string }
      setColEditTitle(j.title)
      setColEditDescription(j.description)
      if (includeImage && j.thumbnailUrl) {
        setColEditThumbnailUrl(j.thumbnailUrl)
      }
      if (includeImage && !j.thumbnailUrl) {
        showToast(j.imageError ? 'Thumbnail generation failed.' : 'Thumbnail not returned.', 'error')
      } else {
        showToast(j.source === 'ai' ? 'AI suggestions applied.' : 'Used fallback (no AI prompt configured).', 'success')
      }
    } catch {
      showToast('AI generation failed.', 'error')
    } finally {
      setAiCollectionGenerating(null)
    }
  }

  async function handleSaveCollection() {
    setColEditSaving(true)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: colEditTitle,
          description: colEditDescription,
          themeKey: colEditThemeKey,
          thumbnailUrl: colEditThumbnailUrl,
        }),
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

  async function handleToggleToolkitPublishing() {
    if (!collection) return
    setActionLoading(collection.id + '-publish')
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedToToolkit: !collection.publishedToToolkit }),
      })
      if (res.ok) {
        showToast(`Collection ${!collection.publishedToToolkit ? 'published to' : 'removed from'} Toolkit.`, 'success')
        fetchCollection()
      } else {
        showToast('Publishing update failed.', 'error')
      }
    } catch {
      showToast('Publishing update failed.', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  function resetForm() {
    setFormTitle('')
    setFormDescription('')
    setFormFile(null)
    setFormThumbnailUrl(null)
    setFormVideoUrl('')
  }

  async function handleZipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const zipFile = e.target.files?.[0]
    e.target.value = ''
    if (!zipFile) return
    setZipUploading(true)
    setZipProgress(0)
    setZipStatusText('Reading ZIP…')
    setZipResults(null)
    setZipErrorsExpanded(false)

    const errors: { fileName: string; error: string }[] = []
    let createdCount = 0

    try {
      // Browser-side extraction. Avoids the 300s serverless function timeout
      // we hit when extracting hundreds of entries in a single Vercel call.
      const zip = await JSZip.loadAsync(zipFile)

      const entries = Object.values(zip.files).filter((entry) => {
        if (entry.dir) return false
        const name = entry.name
        if (name.startsWith('__MACOSX/') || name.includes('/__MACOSX/')) return false
        const base = name.split('/').pop() || ''
        if (base.startsWith('.')) return false
        return true
      })

      if (entries.length === 0) {
        showToast('ZIP contained no usable files.', 'error')
        return
      }

      const total = entries.length

      // Bounded concurrency — browser-driven so timeouts aren't an issue, but
      // we don't want to swamp the network or the Blob API.
      const CONCURRENCY = 4
      let cursor = 0
      let done = 0

      async function processOne(entry: JSZip.JSZipObject) {
        const base = (entry.name.split('/').pop() || entry.name).trim()
        const lastDot = base.lastIndexOf('.')
        const ext = lastDot === -1 || lastDot === base.length - 1 ? '' : base.slice(lastDot + 1).toLowerCase()

        try {
          if (!ext) {
            errors.push({ fileName: base, error: 'No file extension — skipped.' })
            return
          }
          if ((BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) {
            errors.push({ fileName: base, error: `".${ext}" files are not allowed for security reasons.` })
            return
          }
          if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
            errors.push({ fileName: base, error: `".${ext}" is not a supported file type.` })
            return
          }

          const fileBlob = await entry.async('blob')

          const uploaded = await upload(`library/documents/${base}`, fileBlob, {
            access: 'public',
            handleUploadUrl: '/api/super-admin/library/upload/upload-url',
          })

          const titleBase = base.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() || base
          const res = await fetch(`/api/super-admin/library/${collectionId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: titleBase,
              description: 'Uploaded from ZIP.',
              fileUrl: uploaded.url,
              fileName: base,
              fileSize: fileBlob.size,
              fileType: fileBlob.type || 'application/octet-stream',
            }),
          })

          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            errors.push({ fileName: base, error: data.error || 'Failed to save document record.' })
            return
          }
          createdCount++
        } catch (err) {
          errors.push({ fileName: base, error: err instanceof Error ? err.message : 'Upload failed.' })
        } finally {
          done++
          setZipProgress(Math.round((done / total) * 100))
          setZipStatusText(`Processing ${done} of ${total}…`)
        }
      }

      async function worker() {
        while (cursor < entries.length) {
          const idx = cursor++
          await processOne(entries[idx])
        }
      }

      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, () => worker()))

      setZipResults({ created: createdCount, errors, total })
      if (createdCount > 0) fetchCollection()
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'ZIP upload failed.'
      showToast(raw, 'error')
    } finally {
      setZipUploading(false)
      setZipProgress(null)
      setZipStatusText(null)
    }
  }

  async function handleClearAllDocs() {
    if (!collection) return
    const count = collection.documents?.length ?? 0
    if (count === 0) {
      showToast('No documents to delete.', 'error')
      return
    }
    if (!confirm(`Delete all ${count} document${count !== 1 ? 's' : ''} in this collection? The collection itself will be kept. This cannot be undone.`)) return
    setClearingDocs(true)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/documents`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Failed to clear documents.', 'error')
        return
      }
      showToast(`Deleted ${data.deleted} document${data.deleted !== 1 ? 's' : ''}.`, 'success')
      fetchCollection()
    } catch {
      showToast('Failed to clear documents.', 'error')
    } finally {
      setClearingDocs(false)
    }
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
      // Client-direct upload to Vercel Blob (bypasses 4.5 MB serverless body limit).
      const blob = await upload(`library/documents/${formFile.name}`, formFile, {
        access: 'public',
        handleUploadUrl: '/api/super-admin/library/upload/upload-url',
      })

      // Create document record
      const res = await fetch(`/api/super-admin/library/${collectionId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          fileUrl: blob.url,
          fileName: formFile.name,
          fileSize: formFile.size,
          fileType: formFile.type,
          thumbnailUrl: formThumbnailUrl,
          videoUrl: formVideoUrl.trim() || null,
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

  // Move a document to a different section (or to "no section"). Server
  // verifies the section belongs to this collection. We don't reset
  // `order` on move — the doc inherits whatever order it had, which
  // generally puts it at the head of its new bucket; admin can then
  // reorder within the section using the up/down arrows.
  async function handleChangeSection(doc: LibraryDoc, sectionId: string | null) {
    setActionLoading(doc.id + '-section')
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId }),
      })
      if (res.ok) {
        await fetchCollection()
      } else {
        showToast('Failed to move document.', 'error')
      }
    } finally {
      setActionLoading(null)
    }
  }

  // Swap a document's order with its neighbour within the same section /
  // unsectioned bucket. Mirrors the swapModuleOrder pattern used in
  // /super-admin/training: two PATCH requests, sequential ints, no
  // server-side helper.
  async function handleSwapDocOrder(doc: LibraryDoc, direction: -1 | 1) {
    if (!collection) return
    // Pick the neighbour from the same bucket (same sectionId) only —
    // up/down should not move a doc out of its section.
    const peers = collection.documents
      .filter((d) => d.sectionId === doc.sectionId)
      .sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    const idx = peers.findIndex((d) => d.id === doc.id)
    const neighbour = peers[idx + direction]
    if (!neighbour) return
    setActionLoading(doc.id + '-reorder')
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/super-admin/library/${collectionId}/documents/${doc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: neighbour.order }),
        }),
        fetch(`/api/super-admin/library/${collectionId}/documents/${neighbour.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: doc.order }),
        }),
      ])
      if (!r1.ok || !r2.ok) {
        showToast('Failed to reorder documents.', 'error')
      }
      await fetchCollection()
    } finally {
      setActionLoading(null)
    }
  }

  function startEdit(doc: LibraryDoc) {
    setEditingDoc(doc.id)
    setEditTitle(doc.title)
    setEditDescription(doc.description)
    setEditVideoUrl(doc.videoUrl ?? '')
    setEditThumbnailUrl(doc.thumbnailUrl)
  }

  function cancelEdit() {
    setEditingDoc(null)
    setEditTitle('')
    setEditDescription('')
    setEditVideoUrl('')
    setEditThumbnailUrl(null)
  }

  /** AI-regenerate the description and/or image for an existing document.
   *  Image generation uses the current description as the prompt source —
   *  filenames are too thin to make a useful illustration from. */
  async function handleEditAiGenerate(doc: LibraryDoc, generateImage: boolean) {
    if (generateImage && !editDescription.trim()) {
      showToast('Add or generate a description first — the AI image is built from it.', 'error')
      return
    }
    setEditAiGenerating(true)
    try {
      const res = await fetch('/api/super-admin/library/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: doc.fileName,
          generateImage,
          ...(generateImage ? { description: editDescription } : {}),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        // Always update description from AI; only update thumbnail if requested
        if (data.description && !generateImage) setEditDescription(data.description)
        if (generateImage && data.thumbnailUrl) setEditThumbnailUrl(data.thumbnailUrl)
        showToast(generateImage ? 'AI image generated.' : 'AI description generated.', 'success')
      } else {
        showToast('AI generation failed.', 'error')
      }
    } finally {
      setEditAiGenerating(false)
    }
  }

  async function handleSaveEdit(doc: LibraryDoc) {
    setEditSaving(true)
    try {
      const res = await fetch(`/api/super-admin/library/${collectionId}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          videoUrl: editVideoUrl.trim() || null,
          thumbnailUrl: editThumbnailUrl,
        }),
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
                {/* AI Assist — generate title + description from the docs in
                    this collection, with optional thumbnail chained off the
                    description. */}
                <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                  <Sparkles className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  <span className="text-xs text-primary-700 dark:text-primary-300 font-medium mr-1">AI Assist:</span>
                  <button
                    type="button"
                    disabled={aiCollectionGenerating !== null}
                    onClick={() => handleAiGenerateCollection(false)}
                    className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 transition-colors disabled:opacity-40"
                    title="Generate title + description from the documents already in this collection"
                  >
                    {aiCollectionGenerating === 'text' ? 'Generating…' : 'Generate from documents'}
                  </button>
                  <button
                    type="button"
                    disabled={aiCollectionGenerating !== null}
                    onClick={() => handleAiGenerateCollection(true)}
                    className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 transition-colors disabled:opacity-40"
                    title="Generate title + description AND a matching thumbnail"
                  >
                    <ImageIcon className="h-3 w-3 inline mr-1" />
                    {aiCollectionGenerating === 'image' ? 'Generating…' : 'Generate with thumbnail'}
                  </button>
                  <input
                    type="text"
                    placeholder="Optional topic seed (e.g. autistic young people in the workplace)"
                    value={aiCollectionTopic}
                    onChange={(e) => setAiCollectionTopic(e.target.value)}
                    className="flex-1 min-w-[12rem] text-xs rounded-md border border-primary-200 dark:border-primary-800 bg-white dark:bg-slate-700 px-2 py-1"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-primary-700 dark:text-primary-300 cursor-pointer select-none">
                    <input type="checkbox" checked={aiUseBrandStore} onChange={(e) => setAiUseBrandStore(e.target.checked)} className="rounded border-primary-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5" />
                    Use brand store
                  </label>
                </div>

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

                {/* Thumbnail preview + remove. AI-generated thumbnails land
                    here; admins can also clear or upload manually. */}
                <div>
                  <label className="label">Collection thumbnail</label>
                  {colEditThumbnailUrl ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={colEditThumbnailUrl}
                        alt="Collection thumbnail preview"
                        className="h-24 w-24 rounded-lg object-cover border border-calm-200 dark:border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setZoomedImage(colEditThumbnailUrl)}
                      />
                      <button
                        type="button"
                        onClick={() => setColEditThumbnailUrl(null)}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove thumbnail
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600 cursor-pointer transition-colors">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Upload thumbnail
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={async (e) => {
                            const imgFile = e.target.files?.[0]
                            if (!imgFile) return
                            try {
                              const blob = await upload(`library/thumbnails/${imgFile.name}`, imgFile, {
                                access: 'public',
                                handleUploadUrl: '/api/super-admin/library/upload/upload-url',
                              })
                              setColEditThumbnailUrl(blob.url)
                            } catch {
                              showToast('Thumbnail upload failed.', 'error')
                            } finally {
                              e.target.value = ''
                            }
                          }}
                        />
                      </label>
                      <BrandAssetPicker imageOnly onPick={(asset) => setColEditThumbnailUrl(asset.fileUrl)} />
                    </div>
                  )}
                </div>

                <CollectionThemePicker
                  value={colEditThemeKey}
                  onChange={setColEditThemeKey}
                />

                <div className="border-t border-calm-200 dark:border-slate-700 pt-4">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Actions
                  </p>
                  <CollectionActionsPanel
                    collectionId={collection.id}
                    active={collection.active}
                    publishedToToolkit={collection.publishedToToolkit}
                    documentCount={collection.documents?.length ?? 0}
                    onUpdate={fetchCollection}
                    onAfterDelete={() => router.push('/super-admin/library')}
                    onToast={showToast}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveCollection}
                    disabled={colEditSaving || !colEditTitle.trim() || !colEditDescription.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {colEditSaving ? 'Saving...' : 'Save collection'}
                  </button>
                  <button
                    onClick={() => setEditingCollection(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-calm-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Done
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setShowForm((v) => !v); if (showForm) resetForm() }}
              className="btn-primary flex items-center gap-2"
            >
              {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Cancel' : 'Add Document'}
            </button>
          </div>
        )}
      </div>

      {/* ZIP upload progress */}
      {zipUploading && (
        <div className="rounded-xl border border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 dark:text-slate-200">
              {zipStatusText ?? 'Uploading…'}
            </span>
            <span className="font-mono text-slate-500 dark:text-slate-400">
              {zipProgress ?? 0}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-calm-100 dark:bg-slate-700">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${zipProgress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* ZIP upload results */}
      {zipResults && (
        <div className={clsx(
          'rounded-xl border p-4 space-y-2',
          zipResults.created > 0
            ? 'bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {zipResults.created > 0
                ? <CheckCircle className="h-4 w-4 text-sage-600 dark:text-sage-400 flex-shrink-0" />
                : <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              }
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {zipResults.created > 0
                  ? `${zipResults.created} document${zipResults.created !== 1 ? 's' : ''} added from ZIP`
                  : 'No documents were added from ZIP'
                }
                {zipResults.errors.length > 0 && (
                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                    {' '}· {zipResults.errors.length} file{zipResults.errors.length !== 1 ? 's' : ''} skipped
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={() => setZipResults(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {zipResults.errors.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setZipErrorsExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <ChevronDown className={clsx('h-3 w-3 transition-transform', zipErrorsExpanded && 'rotate-180')} />
                {zipErrorsExpanded ? 'Hide' : 'Show'} skipped files
              </button>
              {zipErrorsExpanded && (
                <ul className="mt-2 space-y-1">
                  {zipResults.errors.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span><span className="font-medium">{e.fileName}</span> — {e.error}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

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
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                <Sparkles className="h-4 w-4 text-primary-500 flex-shrink-0" />
                <span className="text-sm text-primary-700 dark:text-primary-300 font-medium mr-2">AI Assist:</span>
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={() => handleAiGenerate(false)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/60 transition-colors disabled:opacity-40"
                >
                  {aiGenerating ? 'Generating…' : 'Generate Title & Description'}
                </button>
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={() => handleAiGenerate(true)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/60 transition-colors disabled:opacity-40"
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
                          const blob = await upload(`library/thumbnails/${imgFile.name}`, imgFile, {
                            access: 'public',
                            handleUploadUrl: '/api/super-admin/library/upload/upload-url',
                          })
                          setFormThumbnailUrl(blob.url)
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

            <div>
              <label className="label">How-to video URL (optional)</label>
              <input
                className="input w-full"
                type="url"
                value={formVideoUrl}
                onChange={(e) => setFormVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=… or any video URL"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                YouTube and Vimeo URLs are embedded automatically; other URLs render as a link.
              </p>
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

      {/* Sections manager — optional grouping for the collection */}
      <SectionsManager
        collectionId={collection.id}
        sections={collection.sections}
        onChanged={fetchCollection}
        onError={(msg) => showToast(msg, 'error')}
      />

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

                    {/* AI Assist row — same options as the upload form */}
                    <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                      <Sparkles className="h-4 w-4 text-primary-500 flex-shrink-0" />
                      <span className="text-xs text-primary-700 dark:text-primary-300 font-medium mr-1">AI Assist:</span>
                      <button
                        type="button"
                        disabled={editAiGenerating}
                        onClick={() => handleEditAiGenerate(doc, false)}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 transition-colors disabled:opacity-40"
                      >
                        {editAiGenerating ? 'Generating…' : 'Regenerate description'}
                      </button>
                      <button
                        type="button"
                        disabled={editAiGenerating}
                        onClick={() => handleEditAiGenerate(doc, true)}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-800/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 transition-colors disabled:opacity-40"
                      >
                        <ImageIcon className="h-3 w-3 inline mr-1" />
                        {editAiGenerating ? 'Generating…' : 'Generate AI image'}
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

                    {/* Thumbnail — manual upload, AI generated, or removed */}
                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">Thumbnail image (optional)</label>
                      {editThumbnailUrl ? (
                        <div className="flex items-start gap-3">
                          <img
                            src={editThumbnailUrl}
                            alt="Thumbnail preview"
                            className="h-20 w-20 rounded-lg object-cover border border-calm-200 dark:border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setZoomedImage(editThumbnailUrl)}
                          />
                          <button
                            type="button"
                            onClick={() => setEditThumbnailUrl(null)}
                            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove image
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600 cursor-pointer transition-colors">
                            <ImageIcon className="h-3.5 w-3.5" />
                            Upload thumbnail
                            <input
                              type="file"
                              className="hidden"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={async (e) => {
                                const imgFile = e.target.files?.[0]
                                if (!imgFile) return
                                try {
                                  const blob = await upload(`library/thumbnails/${imgFile.name}`, imgFile, {
                                    access: 'public',
                                    handleUploadUrl: '/api/super-admin/library/upload/upload-url',
                                  })
                                  setEditThumbnailUrl(blob.url)
                                } catch {
                                  showToast('Thumbnail upload failed.', 'error')
                                } finally {
                                  e.target.value = ''
                                }
                              }}
                            />
                          </label>
                          <BrandAssetPicker imageOnly onPick={(asset) => setEditThumbnailUrl(asset.fileUrl)} />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">How-to video URL <span className="text-slate-400 font-normal">(optional)</span></label>
                      <input
                        className="input w-full text-sm"
                        type="url"
                        value={editVideoUrl}
                        onChange={(e) => setEditVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=…"
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

                  {/* Section dropdown — only render once a section exists */}
                  {collection.sections.length > 0 && (
                    <select
                      value={doc.sectionId ?? ''}
                      disabled={actionLoading === doc.id + '-section'}
                      onChange={(e) => handleChangeSection(doc, e.target.value || null)}
                      className="text-xs rounded-md border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 max-w-[12rem] truncate"
                      title="Move to section"
                    >
                      <option value="">No section</option>
                      {collection.sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  )}

                  {/* Reorder within section / unsectioned bucket */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      disabled={actionLoading === doc.id + '-reorder'}
                      onClick={() => handleSwapDocOrder(doc, -1)}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-25"
                      title="Move up within section"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === doc.id + '-reorder'}
                      onClick={() => handleSwapDocOrder(doc, 1)}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-25"
                      title="Move down within section"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
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
                      href={`/api/library/documents/${doc.id}/file`}
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

      <ImageLightbox src={zoomedImage} onClose={() => setZoomedImage(null)} alt="Zoomed thumbnail" />
    </div>
  )
}
