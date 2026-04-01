'use client'

import { useState, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import {
  FolderOpen,
  Download,
  FileText,
  Search,
  RefreshCw,
  File,
  FileSpreadsheet,
  FileImage,
  Presentation,
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
  createdAt: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet
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
  if (fileType.includes('zip') || fileType.includes('compressed')) return 'ZIP'
  if (fileType.includes('text/plain')) return 'TXT'
  const ext = fileType.split('/').pop()?.toUpperCase() || 'FILE'
  return ext.length > 4 ? 'FILE' : ext
}

export default function LibraryPage() {
  const [documents, setDocuments] = useState<LibraryDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/library')
      if (res.ok) setDocuments(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  function trackEvent(documentId: string, action: 'view' | 'download') {
    fetch('/api/library/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, action }),
    }).catch(() => { /* best-effort tracking */ })
  }

  const filtered = documents.filter((doc) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.description.toLowerCase().includes(q) ||
      doc.fileName.toLowerCase().includes(q)
    )
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          Document Library
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Browse and download training documents, guides, and resources.
        </p>
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input w-full pl-9"
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={fetchDocuments}
          className="p-2 rounded-xl border border-calm-200 dark:border-slate-600 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
          title="Refresh"
        >
          <RefreshCw className={clsx('h-4 w-4', loading && 'animate-spin')} />
        </button>
        <span className="text-sm text-slate-400 dark:text-slate-500">
          {filtered.length} document{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Document grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3" />
          Loading documents…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {search ? 'No documents match your search.' : 'No documents available yet.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-primary-600 dark:text-primary-400 text-sm font-medium mt-2 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const FileIcon = getFileIcon(doc.fileType)
            const typeBadge = getFileTypeBadge(doc.fileType)

            return (
              <div
                key={doc.id}
                className="card p-0 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Thumbnail / placeholder */}
                {doc.thumbnailUrl ? (
                  <div className="h-40 bg-calm-50 dark:bg-slate-700 overflow-hidden">
                    <img
                      src={doc.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-40 bg-calm-50 dark:bg-slate-700 flex items-center justify-center">
                    <FileIcon className="h-16 w-16 text-slate-300 dark:text-slate-500" />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                      {doc.title}
                    </h3>
                    <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-calm-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">
                      {typeBadge}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 flex-1">
                    {doc.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-calm-100 dark:border-slate-700 mt-auto">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatFileSize(doc.fileSize)} &middot;{' '}
                      {new Date(doc.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <a
                      href={doc.fileUrl}
                      download={doc.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent(doc.id, 'download')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
