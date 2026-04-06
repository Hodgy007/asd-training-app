'use client'

import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import {
  InteractiveBlock,
  DragDropData,
  DragDropVariant,
  DragItem,
  DragCategory,
} from '@/types/interactive'

interface DragDropBuilderProps {
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

export function DragDropBuilder({ block, onChange }: DragDropBuilderProps) {
  const data = block.data as DragDropData
  const [titleEdit, setTitleEdit] = useState(block.title)
  const [instructionsEdit, setInstructionsEdit] = useState(block.instructions)

  function updateData(updated: DragDropData) {
    onChange({ ...block, data: updated })
  }

  // ─── Variant ─────────────────────────────────────────────────────────────

  function handleVariantChange(variant: DragDropVariant) {
    updateData({ ...data, variant })
  }

  // ─── Items ───────────────────────────────────────────────────────────────

  function addItem() {
    const newItem: DragItem = { id: generateId('item'), label: '' }
    updateData({ ...data, items: [...data.items, newItem] })
  }

  function updateItem(index: number, updates: Partial<DragItem>) {
    const items = data.items.map((item, i) => (i === index ? { ...item, ...updates } : item))
    updateData({ ...data, items })
  }

  function deleteItem(index: number) {
    const itemId = data.items[index].id
    const items = data.items.filter((_, i) => i !== index)
    // Clean up references
    const correctMatches = data.correctMatches ? { ...data.correctMatches } : {}
    delete correctMatches[itemId]
    const correctOrder = data.correctOrder?.filter(id => id !== itemId)
    updateData({ ...data, items, correctMatches, correctOrder })
  }

  // ─── Categories ──────────────────────────────────────────────────────────

  function addCategory() {
    const newCat: DragCategory = { id: generateId('cat'), label: '', color: '#6366f1' }
    updateData({ ...data, categories: [...(data.categories ?? []), newCat] })
  }

  function updateCategory(index: number, updates: Partial<DragCategory>) {
    const categories = (data.categories ?? []).map((cat, i) => (i === index ? { ...cat, ...updates } : cat))
    updateData({ ...data, categories })
  }

  function deleteCategory(index: number) {
    const catId = (data.categories ?? [])[index].id
    const categories = (data.categories ?? []).filter((_, i) => i !== index)
    // Clean up any matches pointing to this category
    const correctMatches = data.correctMatches ? { ...data.correctMatches } : {}
    for (const [itemId, cId] of Object.entries(correctMatches)) {
      if (cId === catId) delete correctMatches[itemId]
    }
    updateData({ ...data, categories, correctMatches })
  }

  // ─── Correct order (for 'order' variant) ─────────────────────────────────

  function moveOrderItem(index: number, direction: 'up' | 'down') {
    const order = data.correctOrder ? [...data.correctOrder] : data.items.map(i => i.id)
    const newIdx = direction === 'up' ? index - 1 : index + 1
    if (newIdx < 0 || newIdx >= order.length) return
    const temp = order[index]
    order[index] = order[newIdx]
    order[newIdx] = temp
    updateData({ ...data, correctOrder: order })
  }

  // Ensure correctOrder is synced with items when variant is 'order'
  const correctOrder = data.correctOrder && data.correctOrder.length === data.items.length
    ? data.correctOrder
    : data.items.map(i => i.id)

  const orderItems = correctOrder.map(id => data.items.find(i => i.id === id)).filter(Boolean) as DragItem[]

  const showCategories = data.variant === 'categorize' || data.variant === 'match'

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
            placeholder="e.g. Match the signs to developmental areas"
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
            placeholder="Drag each item into the correct category."
          />
        </div>
      </div>

      {/* Variant selector */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
          Variant
        </label>
        <div className="flex gap-3">
          {(['categorize', 'match', 'order'] as DragDropVariant[]).map(v => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`variant-${block.id}`}
                checked={data.variant === v}
                onChange={() => handleVariantChange(v)}
                className="accent-primary-600"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{v}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Items */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
          Items ({data.items.length})
        </label>
        <div className="space-y-2">
          {data.items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-5 text-right">{idx + 1}</span>
              <input
                type="text"
                value={item.label}
                onChange={e => updateItem(idx, { label: e.target.value })}
                className="flex-1 rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
                placeholder="Item label"
              />
              <input
                type="text"
                value={item.imageUrl ?? ''}
                onChange={e => updateItem(idx, { imageUrl: e.target.value || undefined })}
                className="w-48 rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
                placeholder="Image URL (optional)"
              />
              <button
                onClick={() => deleteItem(idx)}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                aria-label="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 font-medium mt-2 hover:underline"
        >
          <Plus className="h-4 w-4" /> Add item
        </button>
      </div>

      {/* Categories (for categorize/match) */}
      {showCategories && (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
            Categories ({(data.categories ?? []).length})
          </label>
          <div className="space-y-2">
            {(data.categories ?? []).map((cat, idx) => (
              <div key={cat.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={cat.label}
                  onChange={e => updateCategory(idx, { label: e.target.value })}
                  className="flex-1 rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  placeholder="Category label"
                />
                <select
                  value={cat.color || '#6366f1'}
                  onChange={e => updateCategory(idx, { color: e.target.value })}
                  className="rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-2 py-2 text-sm text-slate-900 dark:text-white"
                >
                  {PRESET_COLORS.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <span
                  className="w-6 h-6 rounded-full flex-shrink-0 border border-calm-200 dark:border-slate-600"
                  style={{ backgroundColor: cat.color || '#6366f1' }}
                />
                <button
                  onClick={() => deleteCategory(idx)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                  aria-label="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addCategory}
            className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 font-medium mt-2 hover:underline"
          >
            <Plus className="h-4 w-4" /> Add category
          </button>
        </div>
      )}

      {/* Correct answers */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
          Correct Answers
        </label>

        {showCategories && (
          <div className="space-y-2">
            {data.items.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">
                  {item.label || '(untitled item)'}
                </span>
                <select
                  value={data.correctMatches?.[item.id] ?? ''}
                  onChange={e => {
                    const correctMatches = { ...(data.correctMatches ?? {}), [item.id]: e.target.value }
                    updateData({ ...data, correctMatches })
                  }}
                  className="w-48 rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">Select category...</option>
                  {(data.categories ?? []).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label || '(untitled category)'}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {data.variant === 'order' && (
          <div className="space-y-1.5">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Set the correct order by using the arrow buttons.
            </p>
            {orderItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2 bg-calm-50 dark:bg-slate-700 rounded-lg px-3 py-2">
                <span className="text-xs font-bold text-slate-400 w-5 text-right">{idx + 1}</span>
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">
                  {item.label || '(untitled item)'}
                </span>
                <button
                  onClick={() => moveOrderItem(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveOrderItem(idx, 'down')}
                  disabled={idx === orderItems.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
