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
  ArrowLeft,
  ChevronRight,
} from 'lucide-react'

interface LibraryDoc {
  id: string
  title: string
  description: string
  fileUrl: string
  fileName: string
  fileSize: number
  fileType: string
  createdAt: string
}

interface LibraryCollection {
  id: string
  title: string
  description: string
  thumbnailUrl: string | null
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

export default function LibraryPage() {
  const [collections, setCollections] = useState<LibraryCollection[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<LibraryCollection | null>(null)

  const fetchCollections = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/library')
      if (res.ok) setCollections(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  function trackDownload(documentId: string) {
    fetch('/api/library/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    }).catch(() => {})
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
      <div className="max-w-5xl mx-auto space-y-6">
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
          <div className="space-y-2">
            {docs.map((doc) => {
              const FileIcon = getFileIcon(doc.fileType)
              const typeBadge = getFileTypeBadge(doc.fileType)
              return (
                <div key={doc.id} className="card p-0 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="h-12 w-12 rounded-lg bg-calm-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <FileIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.title}</h3>
                        <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-calm-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">{typeBadge}</span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{doc.description}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {formatFileSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <a
                      href={doc.fileUrl}
                      download={doc.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackDownload(doc.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors flex-shrink-0"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Collections view
  return (
    <div className="max-w-5xl mx-auto space-y-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollections.map((col) => (
            <button
              key={col.id}
              onClick={() => { setSelectedCollection(col); setSearch('') }}
              className="card p-0 overflow-hidden text-left hover:shadow-md transition-shadow group"
            >
              {col.thumbnailUrl ? (
                <div className="h-36 bg-calm-50 dark:bg-slate-700 overflow-hidden">
                  <img src={col.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
              ) : (
                <div className="h-36 bg-calm-50 dark:bg-slate-700 flex items-center justify-center">
                  <FolderOpen className="h-14 w-14 text-slate-300 dark:text-slate-500 group-hover:text-primary-400 transition-colors" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {col.title}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5 group-hover:text-primary-400 transition-colors" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{col.description}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {col._count.documents} document{col._count.documents !== 1 ? 's' : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
