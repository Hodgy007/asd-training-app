'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Save, Loader2, ArrowUp, ArrowDown, Trash2, Plus, Upload, Eye,
  Image as ImageIcon, Film, LayoutGrid, Type, Layout,
} from 'lucide-react'
import { ROLE_LABELS } from '@/lib/rbac'
import {
  EDITABLE_HOMEPAGE_ROLES,
  newBlockId,
  type EditableHomepageRole,
  type HomeBlock,
  type Tile,
} from '@/lib/home-blocks'
import { HomeBlocksRenderer } from '@/components/home/home-blocks'
import { HowToPanel } from '@/components/howto/panel'
import HomePageBuilderHowTo from '@/components/howto/super-admin/home'

type BlockKind = HomeBlock['kind']

function emptyBlock(kind: BlockKind): HomeBlock {
  const id = newBlockId()
  switch (kind) {
    case 'hero': return { id, kind, title: '', subtitle: '', imageUrl: '', ctaLabel: '', ctaHref: '' }
    case 'tiles': return { id, kind, columns: 3, tiles: [] }
    case 'richText': return { id, kind, html: '' }
    case 'image': return { id, kind, src: '', alt: '', href: '' }
    case 'video': return { id, kind, src: '', poster: '' }
  }
}

const KIND_LABELS: Record<BlockKind, { label: string; icon: typeof Layout }> = {
  hero: { label: 'Hero', icon: Layout },
  tiles: { label: 'Tiles', icon: LayoutGrid },
  richText: { label: 'Text', icon: Type },
  image: { label: 'Image', icon: ImageIcon },
  video: { label: 'Video', icon: Film },
}

export default function SuperAdminHomePage() {
  const [activeRole, setActiveRole] = useState<EditableHomepageRole>(EDITABLE_HOMEPAGE_ROLES[0])
  const [blocks, setBlocks] = useState<HomeBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/super-admin/home?role=${activeRole}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        setBlocks(Array.isArray(data.blocks) ? data.blocks : [])
        setUpdatedAt(data.updatedAt ?? null)
      })
      .catch(() => showToast('Failed to load home page.', 'error'))
      .finally(() => setLoading(false))
  }, [activeRole, showToast])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/super-admin/home?role=${activeRole}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Save failed')
      }
      const data = await res.json()
      setUpdatedAt(data.updatedAt ?? null)
      showToast('Saved.', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function addBlock(kind: BlockKind) {
    setBlocks([...blocks, emptyBlock(kind)])
  }

  function updateBlock(idx: number, next: HomeBlock) {
    setBlocks(blocks.map((b, i) => (i === idx ? next : b)))
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= blocks.length) return
    const next = [...blocks]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setBlocks(next)
  }

  function removeBlock(idx: number) {
    if (!confirm('Remove this block?')) return
    setBlocks(blocks.filter((_, i) => i !== idx))
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Home Page</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewMode((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Eye className="h-4 w-4" />
            {previewMode ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
        <div className="flex gap-1">
          {EDITABLE_HOMEPAGE_ROLES.map((role) => {
            const active = role === activeRole
            return (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={
                  'px-4 py-2 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ' +
                  (active
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100')
                }
              >
                {ROLE_LABELS[role] ?? role}
              </button>
            )
          })}
        </div>
      </div>

      {updatedAt && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Last saved {new Date(updatedAt).toLocaleString()}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : previewMode ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          {blocks.length > 0 ? (
            <HomeBlocksRenderer blocks={blocks} />
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">No blocks yet.</p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {blocks.map((block, idx) => (
              <BlockCard
                key={block.id}
                block={block}
                isFirst={idx === 0}
                isLast={idx === blocks.length - 1}
                onUpdate={(next) => updateBlock(idx, next)}
                onMoveUp={() => moveBlock(idx, -1)}
                onMoveDown={() => moveBlock(idx, 1)}
                onRemove={() => removeBlock(idx)}
              />
            ))}
            {blocks.length === 0 && (
              <p className="text-center text-slate-500 dark:text-slate-400 py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                No blocks yet. Add one below.
              </p>
            )}
          </div>

          <AddBlockMenu onAdd={addBlock} />
        </>
      )}

      {toast && (
        <div
          role="status"
          className={
            'fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-bold ' +
            (toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white')
          }
        >
          {toast.message}
        </div>
      )}

      <HowToPanel>
        <HomePageBuilderHowTo />
      </HowToPanel>
    </div>
  )
}

function AddBlockMenu({ onAdd }: { onAdd: (kind: BlockKind) => void }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {(Object.keys(KIND_LABELS) as BlockKind[]).map((kind) => {
        const { label, icon: Icon } = KIND_LABELS[kind]
        return (
          <button
            key={kind}
            onClick={() => onAdd(kind)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            <Icon className="h-4 w-4" />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function BlockCard({
  block, isFirst, isLast, onUpdate, onMoveUp, onMoveDown, onRemove,
}: {
  block: HomeBlock
  isFirst: boolean
  isLast: boolean
  onUpdate: (next: HomeBlock) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const { label, icon: Icon } = KIND_LABELS[block.kind]
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
          <Icon className="h-4 w-4" />
          {label}
        </div>
        <div className="flex items-center gap-1">
          <IconButton onClick={onMoveUp} disabled={isFirst} aria-label="Move up"><ArrowUp className="h-4 w-4" /></IconButton>
          <IconButton onClick={onMoveDown} disabled={isLast} aria-label="Move down"><ArrowDown className="h-4 w-4" /></IconButton>
          <IconButton onClick={onRemove} aria-label="Remove" className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="h-4 w-4" /></IconButton>
        </div>
      </div>
      <BlockEditor block={block} onUpdate={onUpdate} />
    </div>
  )
}

function IconButton({ children, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={'p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent ' + className}
    >
      {children}
    </button>
  )
}

function BlockEditor({ block, onUpdate }: { block: HomeBlock; onUpdate: (next: HomeBlock) => void }) {
  switch (block.kind) {
    case 'hero': return <HeroEditor block={block} onUpdate={onUpdate} />
    case 'tiles': return <TilesEditor block={block} onUpdate={onUpdate} />
    case 'richText': return <RichTextEditor block={block} onUpdate={onUpdate} />
    case 'image': return <ImageEditor block={block} onUpdate={onUpdate} />
    case 'video': return <VideoEditor block={block} onUpdate={onUpdate} />
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{children}</label>
}

const inputClass =
  'w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500'

function HeroEditor({ block, onUpdate }: { block: Extract<HomeBlock, { kind: 'hero' }>; onUpdate: (b: HomeBlock) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-3">
      <div>
        <FieldLabel>Title</FieldLabel>
        <input className={inputClass} value={block.title} onChange={(e) => onUpdate({ ...block, title: e.target.value })} maxLength={200} />
      </div>
      <div>
        <FieldLabel>Subtitle</FieldLabel>
        <input className={inputClass} value={block.subtitle} onChange={(e) => onUpdate({ ...block, subtitle: e.target.value })} maxLength={500} />
      </div>
      <div className="md:col-span-2">
        <FieldLabel>Image (optional)</FieldLabel>
        <MediaUpload kind="image" url={block.imageUrl} onChange={(url) => onUpdate({ ...block, imageUrl: url })} />
      </div>
      <div>
        <FieldLabel>Button text (optional)</FieldLabel>
        <input className={inputClass} value={block.ctaLabel} onChange={(e) => onUpdate({ ...block, ctaLabel: e.target.value })} maxLength={60} />
      </div>
      <div>
        <FieldLabel>Button link</FieldLabel>
        <input className={inputClass} value={block.ctaHref} onChange={(e) => onUpdate({ ...block, ctaHref: e.target.value })} placeholder="/training" />
      </div>
    </div>
  )
}

function TilesEditor({ block, onUpdate }: { block: Extract<HomeBlock, { kind: 'tiles' }>; onUpdate: (b: HomeBlock) => void }) {
  function setTile(idx: number, next: Tile) {
    onUpdate({ ...block, tiles: block.tiles.map((t, i) => (i === idx ? next : t)) })
  }
  function addTile() {
    onUpdate({ ...block, tiles: [...block.tiles, { id: newBlockId(), title: '', description: '', iconKey: '', imageUrl: '', href: '' }] })
  }
  function removeTile(idx: number) {
    onUpdate({ ...block, tiles: block.tiles.filter((_, i) => i !== idx) })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <FieldLabel>Columns</FieldLabel>
        <select
          className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
          value={block.columns}
          onChange={(e) => onUpdate({ ...block, columns: Number(e.target.value) as 2 | 3 | 4 })}
        >
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </div>
      <div className="space-y-3">
        {block.tiles.map((tile, idx) => (
          <div key={tile.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Tile {idx + 1}</span>
              <IconButton onClick={() => removeTile(idx)} aria-label="Remove tile" className="hover:text-red-600"><Trash2 className="h-4 w-4" /></IconButton>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              <input className={inputClass} placeholder="Title" value={tile.title} maxLength={120} onChange={(e) => setTile(idx, { ...tile, title: e.target.value })} />
              <input className={inputClass} placeholder="Link (e.g. /training)" value={tile.href} onChange={(e) => setTile(idx, { ...tile, href: e.target.value })} />
              <textarea className={inputClass + ' md:col-span-2'} placeholder="Description" value={tile.description} maxLength={400} rows={2} onChange={(e) => setTile(idx, { ...tile, description: e.target.value })} />
              <div className="md:col-span-2">
                <MediaUpload kind="image" url={tile.imageUrl} onChange={(url) => setTile(idx, { ...tile, imageUrl: url })} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addTile} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-slate-800">
        <Plus className="h-3.5 w-3.5" /> Add tile
      </button>
    </div>
  )
}

function RichTextEditor({ block, onUpdate }: { block: Extract<HomeBlock, { kind: 'richText' }>; onUpdate: (b: HomeBlock) => void }) {
  return (
    <div>
      <FieldLabel>HTML (sanitised on save)</FieldLabel>
      <textarea
        className={inputClass + ' font-mono text-xs'}
        value={block.html}
        onChange={(e) => onUpdate({ ...block, html: e.target.value })}
        rows={8}
        placeholder="<p>Welcome to the platform…</p>"
      />
    </div>
  )
}

function ImageEditor({ block, onUpdate }: { block: Extract<HomeBlock, { kind: 'image' }>; onUpdate: (b: HomeBlock) => void }) {
  return (
    <div className="space-y-3">
      <MediaUpload kind="image" url={block.src} onChange={(url) => onUpdate({ ...block, src: url })} />
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <FieldLabel>Alt text</FieldLabel>
          <input className={inputClass} value={block.alt} onChange={(e) => onUpdate({ ...block, alt: e.target.value })} maxLength={300} />
        </div>
        <div>
          <FieldLabel>Link (optional)</FieldLabel>
          <input className={inputClass} value={block.href} onChange={(e) => onUpdate({ ...block, href: e.target.value })} />
        </div>
      </div>
    </div>
  )
}

function VideoEditor({ block, onUpdate }: { block: Extract<HomeBlock, { kind: 'video' }>; onUpdate: (b: HomeBlock) => void }) {
  return (
    <div className="space-y-3">
      <MediaUpload kind="video" url={block.src} onChange={(url) => onUpdate({ ...block, src: url })} />
      <div>
        <FieldLabel>Poster image (optional)</FieldLabel>
        <MediaUpload kind="image" url={block.poster} onChange={(url) => onUpdate({ ...block, poster: url })} />
      </div>
    </div>
  )
}

function MediaUpload({ kind, url, onChange }: { kind: 'image' | 'video'; url: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', kind)
      const res = await fetch('/api/super-admin/home/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <input
          className={inputClass}
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder={kind === 'image' ? 'https://… (or upload)' : 'https://… (mp4)'}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={kind === 'image' ? 'image/*' : 'video/*'}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) upload(file)
            e.target.value = ''
          }}
        />
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {url && kind === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-24 w-auto rounded-lg border border-slate-200 dark:border-slate-700" />
      )}
    </div>
  )
}
