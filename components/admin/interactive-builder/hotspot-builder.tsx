'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  InteractiveBlock,
  HotspotData,
  HotspotVariant,
  Hotspot,
  RevealCard,
} from '@/types/interactive'

interface HotspotBuilderProps {
  block: InteractiveBlock
  onChange: (updated: InteractiveBlock) => void
}

function generateId(prefix: string) {
  return prefix + '-' + Math.random().toString(36).slice(2, 7)
}

const PRESET_COLORS = [
  { value: '#6366f1', label: 'Indigo' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f43f5e', label: 'Rose' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#22c55e', label: 'Green' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#64748b', label: 'Slate' },
]

export function HotspotBuilder({ block, onChange }: HotspotBuilderProps) {
  const data = block.data as HotspotData
  const [titleEdit, setTitleEdit] = useState(block.title)
  const [instructionsEdit, setInstructionsEdit] = useState(block.instructions)

  function updateData(updated: HotspotData) {
    onChange({ ...block, data: updated })
  }

  // ─── Variant ─────────────────────────────────────────────────────────────

  function handleVariantChange(variant: HotspotVariant) {
    updateData({ ...data, variant })
  }

  // ─── Hotspots (image-hotspot variant) ────────────────────────────────────

  function addHotspot() {
    const newHotspot: Hotspot = {
      id: generateId('hs'),
      x: 50,
      y: 50,
      radius: 22,
      title: '',
      content: '',
    }
    updateData({ ...data, hotspots: [...(data.hotspots ?? []), newHotspot] })
  }

  function updateHotspot(index: number, updates: Partial<Hotspot>) {
    const hotspots = (data.hotspots ?? []).map((h, i) => (i === index ? { ...h, ...updates } : h))
    updateData({ ...data, hotspots })
  }

  function deleteHotspot(index: number) {
    const hotspots = (data.hotspots ?? []).filter((_, i) => i !== index)
    updateData({ ...data, hotspots })
  }

  // ─── Cards (card-reveal variant) ─────────────────────────────────────────

  function addCard() {
    const newCard: RevealCard = {
      id: generateId('card'),
      frontLabel: '',
      backContent: '',
      color: '#6366f1',
    }
    updateData({ ...data, cards: [...(data.cards ?? []), newCard] })
  }

  function updateCard(index: number, updates: Partial<RevealCard>) {
    const cards = (data.cards ?? []).map((c, i) => (i === index ? { ...c, ...updates } : c))
    updateData({ ...data, cards })
  }

  function deleteCard(index: number) {
    const cards = (data.cards ?? []).filter((_, i) => i !== index)
    updateData({ ...data, cards })
  }

  // ─── Image click-to-place hotspot ────────────────────────────────────────

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const newHotspot: Hotspot = {
      id: generateId('hs'),
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      radius: 22,
      title: '',
      content: '',
    }
    updateData({ ...data, hotspots: [...(data.hotspots ?? []), newHotspot] })
  }

  return (
    <div className="space-y-4">
      {/* Block metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={titleEdit}
            onChange={e => {
              setTitleEdit(e.target.value)
              onChange({ ...block, title: e.target.value })
            }}
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            placeholder="e.g. Explore the classroom environment"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Instructions</label>
          <input
            type="text"
            value={instructionsEdit}
            onChange={e => {
              setInstructionsEdit(e.target.value)
              onChange({ ...block, instructions: e.target.value })
            }}
            className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
            placeholder="Click each hotspot to learn more."
          />
        </div>
      </div>

      {/* Variant selector */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
          Variant
        </label>
        <div className="flex gap-3">
          {(['image-hotspot', 'card-reveal'] as HotspotVariant[]).map(v => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`variant-${block.id}`}
                checked={data.variant === v}
                onChange={() => handleVariantChange(v)}
                className="accent-primary-600"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {v === 'image-hotspot' ? 'Image hotspot' : 'Card reveal'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ─── Image Hotspot Variant ──────────────────────────────────────────── */}
      {data.variant === 'image-hotspot' && (
        <>
          {/* Image URL */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Image URL</label>
            <input
              type="text"
              value={data.imageUrl ?? ''}
              onChange={e => updateData({ ...data, imageUrl: e.target.value || undefined })}
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
              placeholder="Paste image URL (from training upload or external)"
            />
          </div>

          {/* Image preview with click-to-place */}
          {data.imageUrl && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                Click on the image to place a new hotspot, or edit positions in the list below.
              </p>
              <div
                className="relative rounded-xl overflow-hidden border border-calm-200 dark:border-slate-700 cursor-crosshair"
                onClick={handleImageClick}
              >
                <img src={data.imageUrl} alt="" className="w-full h-auto block" />
                {(data.hotspots ?? []).map((h, idx) => (
                  <div
                    key={h.id}
                    className="absolute w-6 h-6 rounded-full bg-amber-400 border-2 border-white text-white text-xs font-bold flex items-center justify-center pointer-events-none"
                    style={{
                      left: `${h.x}%`,
                      top: `${h.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotspot list */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
              Hotspots ({(data.hotspots ?? []).length})
            </label>
            <div className="space-y-3">
              {(data.hotspots ?? []).map((hotspot, idx) => (
                <div
                  key={hotspot.id}
                  className="rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50/50 dark:bg-slate-700/50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Hotspot {idx + 1}</span>
                    <button
                      onClick={() => deleteHotspot(idx)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded"
                      aria-label="Delete hotspot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">X (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={hotspot.x}
                        onChange={e => updateHotspot(idx, { x: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Y (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={hotspot.y}
                        onChange={e => updateHotspot(idx, { y: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Radius (px)</label>
                      <input
                        type="number"
                        min={10}
                        max={60}
                        value={hotspot.radius}
                        onChange={e => updateHotspot(idx, { radius: parseInt(e.target.value) || 22 })}
                        className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Title</label>
                    <input
                      type="text"
                      value={hotspot.title}
                      onChange={e => updateHotspot(idx, { title: e.target.value })}
                      className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                      placeholder="Hotspot title"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Content</label>
                    <textarea
                      value={hotspot.content}
                      onChange={e => updateHotspot(idx, { content: e.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white resize-none"
                      placeholder="What the learner will see when they click this hotspot"
                    />
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addHotspot}
              className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 font-medium mt-2 hover:underline"
            >
              <Plus className="h-4 w-4" /> Add hotspot
            </button>
          </div>
        </>
      )}

      {/* ─── Card Reveal Variant ────────────────────────────────────────────── */}
      {data.variant === 'card-reveal' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
            Cards ({(data.cards ?? []).length})
          </label>
          <div className="space-y-3">
            {(data.cards ?? []).map((card, idx) => (
              <div
                key={card.id}
                className="rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50/50 dark:bg-slate-700/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase">Card {idx + 1}</span>
                  <button
                    onClick={() => deleteCard(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                    aria-label="Delete card"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Front label</label>
                    <input
                      type="text"
                      value={card.frontLabel}
                      onChange={e => updateCard(idx, { frontLabel: e.target.value })}
                      className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                      placeholder="e.g. Social Communication"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Front icon (optional)</label>
                    <input
                      type="text"
                      value={card.frontIcon ?? ''}
                      onChange={e => updateCard(idx, { frontIcon: e.target.value || undefined })}
                      className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                      placeholder="e.g. emoji or text"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Back content</label>
                  <textarea
                    value={card.backContent}
                    onChange={e => updateCard(idx, { backContent: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white resize-none"
                    placeholder="Content revealed when the card is flipped"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-0.5">Accent colour</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={card.color || '#6366f1'}
                      onChange={e => updateCard(idx, { color: e.target.value })}
                      className="flex-1 rounded-lg border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-slate-900 dark:text-white"
                    >
                      {PRESET_COLORS.map(c => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <span
                      className="w-6 h-6 rounded-full flex-shrink-0 border border-calm-200 dark:border-slate-600"
                      style={{ backgroundColor: card.color || '#6366f1' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addCard}
            className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 font-medium mt-2 hover:underline"
          >
            <Plus className="h-4 w-4" /> Add card
          </button>
        </div>
      )}
    </div>
  )
}
