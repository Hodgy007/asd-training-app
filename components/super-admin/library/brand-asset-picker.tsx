'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { ImagePlus, X, Search, FileText } from 'lucide-react'

interface BrandAssetLite {
  id: string
  type: string
  title: string
  description: string | null
  fileUrl: string
  fileName: string
  fileType: string
  active: boolean
}

const TYPE_LABELS: Record<string, string> = {
  LOGO: 'Logo',
  BRAND_GUIDELINES: 'Brand guidelines',
  IMAGERY: 'Imagery',
  COLOUR_PALETTE: 'Colour palette',
  MESSAGING: 'Messaging',
  OTHER: 'Other',
}

interface Props {
  // Restrict the picker to specific types. Most image-thumbnail callers
  // pass `imageOnly` and we filter to LOGO + IMAGERY + COLOUR_PALETTE.
  imageOnly?: boolean
  onPick: (asset: BrandAssetLite) => void
  // Optional trigger label/className override for callers that want a
  // particular look (e.g. inline button vs full-width pill).
  triggerLabel?: string
  triggerClassName?: string
}

const IMAGE_TYPES_FILTER = (a: BrandAssetLite) =>
  a.fileType.startsWith('image/') ||
  a.type === 'LOGO' ||
  a.type === 'IMAGERY' ||
  a.type === 'COLOUR_PALETTE'

// Compact dialog that lists active brand assets and returns the picked
// one to the caller. Reused everywhere the admin can choose a thumbnail
// or cover image — Library collection forms, Library document forms,
// and (future) any other image-upload field.
export function BrandAssetPicker({ imageOnly = true, onPick, triggerLabel, triggerClassName }: Props) {
  const [open, setOpen] = useState(false)
  const [assets, setAssets] = useState<BrandAssetLite[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open || assets !== null) return
    fetch('/api/super-admin/brand-assets?active=true', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((j) => setAssets(j.assets ?? []))
      .catch((e) => setError(typeof e === 'string' ? e : 'Failed to load brand assets.'))
  }, [open, assets])

  const filtered = (assets ?? [])
    .filter((a) => imageOnly ? IMAGE_TYPES_FILTER(a) : true)
    .filter((a) => search.trim() === '' || a.title.toLowerCase().includes(search.toLowerCase()) || a.description?.toLowerCase().includes(search.toLowerCase()))

  function close() {
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? 'inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-600 cursor-pointer transition-colors'}
      >
        <ImagePlus className="h-3.5 w-3.5" />
        {triggerLabel ?? 'Pick from brand store'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4"
          onClick={close}
        >
          <div
            className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-calm-200 dark:border-slate-700">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Pick from brand store
              </h2>
              <button
                type="button"
                onClick={close}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-calm-100 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by title or description…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input w-full pl-9 text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : assets === null ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400 dark:text-slate-500">
                  No matching brand assets.
                  <br />
                  <a
                    href="/super-admin/brand-assets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline mt-2 inline-block"
                  >
                    Manage brand store →
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map((a) => {
                    const isImg = a.fileType.startsWith('image/')
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { onPick(a); close() }}
                        className={clsx(
                          'group relative flex flex-col bg-white dark:bg-slate-700 rounded-xl overflow-hidden border border-calm-200 dark:border-slate-600',
                          'hover:border-primary-400 hover:shadow-md transition-all text-left',
                        )}
                        title={a.description ?? a.title}
                      >
                        <div className="aspect-square bg-calm-50 dark:bg-slate-800 flex items-center justify-center">
                          {isImg ? (
                            <img src={a.fileUrl} alt={a.title} className="h-full w-full object-contain p-2" />
                          ) : (
                            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-500" />
                          )}
                        </div>
                        <div className="p-2 flex-1">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{a.title}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">{TYPE_LABELS[a.type] ?? a.type}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
