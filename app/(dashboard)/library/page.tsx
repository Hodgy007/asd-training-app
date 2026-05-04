'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import {
  FolderOpen,
  Download,
  Eye,
  FileText,
  Search,
  RefreshCw,
  File,
  FileSpreadsheet,
  FileImage,
  Presentation,
  ArrowLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { HowToPanel } from '@/components/howto/panel'
import LibraryHowTo from '@/components/howto/learner/library'
import { ImageLightbox } from '@/components/ui/image-lightbox'

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
  createdAt: string
}

// Toolkit-style colour palette — cycled through tiles so the wall feels lively
// without each title needing its own colour.
const TILE_THEMES = {
  orange: { bg: '#FFEDD2', accent: '#F5821F', shape: '#FCAF17' },
  green:  { bg: '#E0F6E5', accent: '#34B44A', shape: '#7DD8A0' },
  blue:   { bg: '#DDEEF8', accent: '#056BB0', shape: '#44C7EE' },
  pink:   { bg: '#FCE3F2', accent: '#E13CAF', shape: '#F7A8DA' },
  yellow: { bg: '#FFF3CC', accent: '#FCAF17', shape: '#FFD84D' },
  cyan:   { bg: '#E0F4FB', accent: '#44C7EE', shape: '#7BDBF1' },
} as const
type ThemeKey = keyof typeof TILE_THEMES
const THEME_KEYS = Object.keys(TILE_THEMES) as ThemeKey[]

/** Resolve a theme: explicit themeKey wins, otherwise hash by id (or by index). */
function themeFor(idOrIndex: string | number, explicitKey?: string | null): typeof TILE_THEMES[ThemeKey] {
  if (explicitKey && (THEME_KEYS as readonly string[]).includes(explicitKey)) {
    return TILE_THEMES[explicitKey as ThemeKey]
  }
  const i = typeof idOrIndex === 'number'
    ? idOrIndex
    : Array.from(idOrIndex).reduce((a, c) => a + c.charCodeAt(0), 0)
  return TILE_THEMES[THEME_KEYS[i % THEME_KEYS.length]]
}

/** Convert a YouTube/Vimeo watch URL to an embeddable URL. Returns null for unsupported hosts. */
function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    // YouTube — watch?v=, youtu.be/, embed/, shorts/
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
      let id: string | null = null
      if (u.hostname === 'youtu.be') id = u.pathname.slice(1)
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2]
      else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2]
      else id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
    }
    // Vimeo
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }
  } catch {
    // fall through
  }
  return null
}

interface LibraryCollection {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
  themeKey: string | null
  _count: { documents: number }
  documents: LibraryDoc[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet
  if (fileType.includes('image')) return FileImage
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return Presentation
  return File
}

function getFileTypeBadge(fileType: string): string {
  if (fileType.includes('pdf')) return 'PDF'
  if (fileType.includes('word') || fileType.includes('document')) return 'DOC'
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'XLS'
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'PPT'
  if (fileType.includes('image')) return 'IMG'
  if (fileType.includes('zip')) return 'ZIP'
  if (fileType.includes('text/plain')) return 'TXT'
  const ext = fileType.split('/').pop()?.toUpperCase() || 'FILE'
  return ext.length > 4 ? 'FILE' : ext
}

export default function LibraryPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-16 text-slate-400"><RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />Loading...</div>}>
      <LibraryPage />
    </Suspense>
  )
}

function LibraryPage() {
  const searchParams = useSearchParams()
  const collectionParam = searchParams.get('c')
  const [collections, setCollections] = useState<LibraryCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<LibraryCollection | null>(null)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/library')
      if (res.ok) {
        const data: LibraryCollection[] = await res.json()
        setCollections(data)
        // Auto-select only when the URL points at a specific collection
        // (sidebar deep-link). Otherwise always show the colourful grid first
        // — even with a single collection — so learners see the landing page.
        if (collectionParam) {
          const match = data.find((col) => col.id === collectionParam)
          if (match) setSelectedCollection(match)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [collectionParam])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  // React to query param changes (sidebar clicks)
  useEffect(() => {
    if (collectionParam && collections.length > 0) {
      const match = collections.find((col) => col.id === collectionParam)
      if (match) setSelectedCollection(match)
    }
  }, [collectionParam, collections])

  function trackEvent(documentId: string, action: 'view' | 'download') {
    fetch('/api/library/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, action }),
    }).catch(() => {})
  }

  // File types the file proxy will serve inline (matches the server-side
  // INLINE_VIEWABLE_PREFIXES list). For everything else (Office docs etc.)
  // we hide the View button — the browser would just download anyway.
  function isViewable(fileType: string | null | undefined): boolean {
    if (!fileType) return false
    return (
      fileType === 'application/pdf' ||
      fileType.startsWith('image/') ||
      fileType.startsWith('video/') ||
      fileType.startsWith('audio/') ||
      fileType.startsWith('text/')
    )
  }

  // Filter collections or documents based on search
  const filteredCollections = collections.filter((col) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      col.title.toLowerCase().includes(q) ||
      col.description.toLowerCase().includes(q) ||
      col.documents.some((d) => d.title.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q))
    )
  })

  // If viewing a collection's documents
  if (selectedCollection) {
    const docs = selectedCollection.documents.filter((doc) => {
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return doc.title.toLowerCase().includes(q) || doc.fileName.toLowerCase().includes(q)
    })

    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
        <div>
          <button
            onClick={() => { setSelectedCollection(null); setSearch('') }}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to library
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            {selectedCollection.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedCollection.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input className="input w-full pl-9" type="text" placeholder="Search documents…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-slate-400 dark:text-slate-500">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
        </div>

        {docs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {search ? 'No documents match your search.' : 'No documents in this collection yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
            {docs.map((doc, idx) => {
              const FileIcon = getFileIcon(doc.fileType)
              const typeBadge = getFileTypeBadge(doc.fileType)
              const embedUrl = doc.videoUrl ? toEmbedUrl(doc.videoUrl) : null
              const theme = themeFor(idx)
              return (
                <div
                  key={doc.id}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-white dark:bg-slate-800 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* Header — coloured panel with thumbnail or file icon */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: theme.bg }}>
                    <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full opacity-60" style={{ backgroundColor: theme.shape }} aria-hidden="true" />
                    <div className="pointer-events-none absolute -top-6 -left-6 h-20 w-20 rounded-full opacity-40" style={{ backgroundColor: theme.shape }} aria-hidden="true" />
                    {doc.thumbnailUrl ? (
                      <button
                        type="button"
                        onClick={() => setZoomedImage(doc.thumbnailUrl)}
                        className="relative block h-full w-full"
                        title="Zoom"
                      >
                        <img
                          src={doc.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </button>
                    ) : (
                      <div className="relative flex h-full w-full items-center justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 shadow-sm">
                          <FileIcon className="h-10 w-10" style={{ color: theme.accent }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ backgroundColor: `${theme.accent}1A`, color: theme.accent }}
                      >
                        {typeBadge}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatFileSize(doc.fileSize)}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold leading-tight text-slate-900 dark:text-slate-100 line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-3">
                      {doc.description}
                    </p>

                    {/* How-to video — embedded if YouTube/Vimeo, otherwise rendered as a link */}
                    {doc.videoUrl && (
                      <div className="rounded-xl border border-calm-100 dark:border-slate-700 bg-calm-50/60 dark:bg-slate-900/40 p-3">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                          How to use
                        </p>
                        {embedUrl ? (
                          <div className="aspect-video rounded-lg overflow-hidden bg-black">
                            <iframe
                              src={embedUrl}
                              title={`How to use ${doc.title}`}
                              loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="h-full w-full border-0"
                            />
                          </div>
                        ) : (
                          <a
                            href={doc.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                            style={{ color: theme.accent }}
                          >
                            Watch instructions →
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mt-auto flex gap-2 pt-2">
                      {isViewable(doc.fileType) && (
                        <a
                          href={`/api/library/documents/${doc.id}/file?disposition=inline`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent(doc.id, 'view')}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold shadow-sm transition-all hover:shadow-md"
                          style={{ color: theme.accent, borderColor: theme.accent }}
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </a>
                      )}
                      <a
                        href={`/api/library/documents/${doc.id}/file`}
                        download={doc.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEvent(doc.id, 'download')}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:shadow-md"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <ImageLightbox src={zoomedImage} onClose={() => setZoomedImage(null)} alt="Zoomed thumbnail" />

        <HowToPanel>
          <LibraryHowTo />
        </HowToPanel>
      </div>
    )
  }

  // Collections view
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          Document Library
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Browse document collections and download resources.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input className="input w-full pl-9" type="text" placeholder="Search collections…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button
          onClick={fetchCollections}
          className="p-2 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
          title="Refresh"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
        </button>
        <span className="text-sm text-slate-400 dark:text-slate-500">{filteredCollections.length} collection{filteredCollections.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />
          Loading…
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {search ? 'No collections match your search.' : 'No document collections available yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-stagger">
          {filteredCollections.map((col, idx) => {
            const theme = themeFor(col.id || idx, col.themeKey)
            return (
              <button
                key={col.id}
                onClick={() => { setSelectedCollection(col); setSearch('') }}
                className="group relative flex h-full flex-col overflow-hidden rounded-[28px] bg-white dark:bg-slate-800 shadow-md text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ outlineColor: theme.accent }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ backgroundColor: theme.bg }}>
                  <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full opacity-60" style={{ backgroundColor: theme.shape }} aria-hidden="true" />
                  <div className="pointer-events-none absolute -top-6 -left-6 h-20 w-20 rounded-full opacity-40" style={{ backgroundColor: theme.shape }} aria-hidden="true" />
                  {col.thumbnailUrl ? (
                    <img
                      src={col.thumbnailUrl}
                      alt=""
                      className="relative h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="relative flex h-full w-full items-center justify-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 shadow-sm">
                        <FolderOpen className="h-10 w-10" style={{ color: theme.accent }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <span
                    className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: `${theme.accent}1A`, color: theme.accent }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
                    Collection
                  </span>
                  <h3 className="text-lg font-extrabold leading-tight text-slate-900 dark:text-slate-100">{col.title}</h3>
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{col.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <FileText className="h-3.5 w-3.5" />
                      {col._count.documents} {col._count.documents === 1 ? 'document' : 'documents'}
                    </span>
                    <ChevronRight className="h-5 w-5" style={{ color: theme.accent }} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <HowToPanel>
        <LibraryHowTo />
      </HowToPanel>
    </div>
  )
}
