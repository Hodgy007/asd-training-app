'use client'

import { useEffect, useState } from 'react'
import { X, Search, Loader2, ImageIcon } from 'lucide-react'
import { clsx } from 'clsx'

type Folder = 'carousel-images' | 'hotspot-images' | 'all'

interface ImageItem {
  url: string
  pathname: string
  folder: 'carousel-images' | 'hotspot-images'
  size: number
  uploadedAt: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
  /** Restrict the picker to one folder. Default 'all' shows both. */
  folder?: Folder
  title?: string
}

function fileNameFromPath(p: string): string {
  // pathname looks like 'hotspot-images/wheel-CSlb0eyszpC60UJ0OLUEq3ZlVTfczm.png'
  // Strip the random suffix Vercel Blob adds (-<base64>) before the extension.
  const base = p.split('/').pop() ?? p
  return base.replace(/-[A-Za-z0-9]{20,}(?=\.[a-z0-9]+$)/i, '')
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function ImagePickerModal({ open, onClose, onSelect, folder = 'all', title = 'Pick an image' }: Props) {
  const [items, setItems] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    fetch(`/api/super-admin/training/images?folder=${folder}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load (${r.status})`)
        return r.json() as Promise<ImageItem[]>
      })
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [open, folder])

  if (!open) return null

  const visible = items.filter((it) => {
    if (!search.trim()) return true
    return fileNameFromPath(it.pathname).toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-5 border-b border-calm-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary-600" />
              {title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {folder === 'all'
                ? 'Reuse any image you’ve previously uploaded for hotspots or carousels.'
                : folder === 'hotspot-images'
                  ? 'Images you’ve previously used in hotspot blocks.'
                  : 'Images you’ve previously used in carousel slides.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-calm-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-calm-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-calm-200 dark:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center h-40 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading images…
            </div>
          )}
          {error && !loading && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              {error}
            </div>
          )}
          {!loading && !error && visible.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-500 dark:text-slate-400">
              {items.length === 0
                ? 'No previously uploaded images yet. Upload one and it will appear here next time.'
                : 'No matches for that search.'}
            </div>
          )}
          {!loading && !error && visible.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {visible.map((it) => (
                <button
                  key={it.url}
                  onClick={() => { onSelect(it.url); onClose() }}
                  className={clsx(
                    'group rounded-xl overflow-hidden border-2 border-calm-200 dark:border-slate-700',
                    'hover:border-primary-400 dark:hover:border-primary-500 transition-colors',
                    'bg-white dark:bg-slate-900 text-left flex flex-col'
                  )}
                  title={`Insert ${fileNameFromPath(it.pathname)}`}
                >
                  <div className="aspect-square bg-calm-50 dark:bg-slate-800 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-2 py-1.5 border-t border-calm-100 dark:border-slate-700">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {fileNameFromPath(it.pathname)}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {it.folder === 'carousel-images' ? 'Carousel' : 'Hotspot'} · {fmtSize(it.size)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-calm-200 dark:border-slate-700 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {!loading && !error && `${visible.length} image${visible.length === 1 ? '' : 's'}`}
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
