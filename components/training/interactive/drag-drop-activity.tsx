'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle, XCircle, RotateCcw, GripVertical } from 'lucide-react'
import { DragDropData, DragItem } from '@/types/interactive'
import { BlockInstructions } from './block-instructions'
import { BlockCompletionBadge } from './block-completion-badge'

interface DragDropActivityProps {
  title: string
  instructions: string
  data: DragDropData
  completed: boolean
  onComplete: () => void
}

// ─── Pointer drag helpers ────────────────────────────────────────────────────

interface DragState {
  active: boolean
  itemId: string
  startX: number
  startY: number
  offsetX: number
  offsetY: number
}

const initialDragState: DragState = {
  active: false,
  itemId: '',
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
}

// ─── Categorize variant ──────────────────────────────────────────────────────

function CategorizeVariant({
  data,
  checked,
  results,
  onCheck,
  onReset,
}: {
  data: DragDropData
  checked: boolean
  results: Record<string, boolean> | null
  onCheck: (placements: Record<string, string>) => void
  onReset: () => void
}) {
  // placements: itemId -> categoryId
  const [placements, setPlacements] = useState<Record<string, string>>({})
  const dragRef = useRef<DragState>({ ...initialDragState })
  const [dragTransform, setDragTransform] = useState<{ itemId: string; x: number; y: number } | null>(null)
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null)

  const unplacedItems = data.items.filter(item => !placements[item.id])

  function handlePointerDown(e: React.PointerEvent, itemId: string) {
    if (checked) return
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    const rect = el.getBoundingClientRect()
    dragRef.current = {
      active: true,
      itemId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
    setDragTransform({ itemId, x: 0, y: 0 })
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setDragTransform({ itemId: dragRef.current.itemId, x: dx, y: dy })

    // Detect which category zone we're over
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const zone = el?.closest('[data-category-id]')
    setHighlightedCategory(zone ? zone.getAttribute('data-category-id') : null)
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragRef.current.active) return
    const { itemId } = dragRef.current
    dragRef.current = { ...initialDragState }
    setDragTransform(null)
    setHighlightedCategory(null)

    const el = document.elementFromPoint(e.clientX, e.clientY)
    const zone = el?.closest('[data-category-id]')
    if (zone) {
      const categoryId = zone.getAttribute('data-category-id')!
      setPlacements(prev => ({ ...prev, [itemId]: categoryId }))
    }
  }

  function removeItem(itemId: string) {
    if (checked) return
    setPlacements(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  function handleReset() {
    setPlacements({})
    onReset()
  }

  const categories = data.categories ?? []

  function itemResult(itemId: string): 'correct' | 'wrong' | null {
    if (!results) return null
    if (!(itemId in results)) return null
    return results[itemId] ? 'correct' : 'wrong'
  }

  return (
    <div>
      {/* Unplaced items */}
      {unplacedItems.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Items to categorise
          </p>
          <div
            className="flex flex-wrap gap-2"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {unplacedItems.map(item => {
              const isDragging = dragTransform?.itemId === item.id
              return (
                <div
                  key={item.id}
                  onPointerDown={e => handlePointerDown(e, item.id)}
                  className="select-none cursor-grab active:cursor-grabbing rounded-md border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white min-h-[48px] flex items-center gap-2 touch-manipulation shadow-sm hover:shadow-md transition-shadow"
                  style={{
                    touchAction: 'none',
                    transform: isDragging ? `translate(${dragTransform.x}px, ${dragTransform.y}px)` : undefined,
                    zIndex: isDragging ? 50 : undefined,
                    position: 'relative',
                  }}
                >
                  <GripVertical className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="h-8 w-8 object-contain rounded" />
                  )}
                  {item.label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Category drop zones */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 3)}, minmax(0, 1fr))` }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {categories.map(cat => {
          const catItems = data.items.filter(item => placements[item.id] === cat.id)
          const isHighlighted = highlightedCategory === cat.id
          return (
            <div
              key={cat.id}
              data-category-id={cat.id}
              className={`rounded-lg border transition-colors min-h-[120px] overflow-hidden ${
                isHighlighted
                  ? 'border-primary-400 dark:border-primary-500 bg-primary-50/30 dark:bg-primary-900/10 shadow-md'
                  : 'border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm'
              }`}
            >
              <div
                className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-white"
                style={{ backgroundColor: cat.color || '#6366f1' }}
              >
                {cat.label}
              </div>
              <div className="p-2.5 space-y-1.5" data-category-id={cat.id}>
                {catItems.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic p-2" data-category-id={cat.id}>
                    Drop items here
                  </p>
                )}
                {catItems.map(item => {
                  const res = itemResult(item.id)
                  return (
                    <div
                      key={item.id}
                      className={`rounded-md border px-3 py-2 text-sm font-medium flex items-center gap-2 min-h-[48px] ${
                        res === 'correct'
                          ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-200'
                          : res === 'wrong'
                          ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200'
                          : 'border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 text-slate-900 dark:text-white'
                      }`}
                    >
                      {res === 'correct' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                      {res === 'wrong' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt="" className="h-8 w-8 object-contain rounded" />
                      )}
                      <span className="flex-1">{item.label}</span>
                      {!checked && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-red-500 p-0.5"
                          aria-label={`Remove ${item.label}`}
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4">
        {!checked && (
          <button
            onClick={() => onCheck(placements)}
            disabled={Object.keys(placements).length !== data.items.length}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[48px]"
          >
            Check answers
          </button>
        )}
        {checked && results && Object.values(results).some(v => !v) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-calm-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors min-h-[48px]"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Match variant ───────────────────────────────────────────────────────────

function MatchVariant({
  data,
  checked,
  results,
  onCheck,
  onReset,
}: {
  data: DragDropData
  checked: boolean
  results: Record<string, boolean> | null
  onCheck: (placements: Record<string, string>) => void
  onReset: () => void
}) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  // matches: itemId -> categoryId
  const [matches, setMatches] = useState<Record<string, string>>({})
  const matchedCategoryIds = new Set(Object.values(matches))

  const categories = data.categories ?? []

  function handleItemClick(itemId: string) {
    if (checked) return
    if (matches[itemId]) {
      // Unmatch
      setMatches(prev => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
      setSelectedItem(null)
      return
    }
    setSelectedItem(itemId)
  }

  function handleCategoryClick(categoryId: string) {
    if (checked || !selectedItem) return
    if (matchedCategoryIds.has(categoryId)) return
    setMatches(prev => ({ ...prev, [selectedItem]: categoryId }))
    setSelectedItem(null)
  }

  function handleReset() {
    setMatches({})
    setSelectedItem(null)
    onReset()
  }

  function itemResult(itemId: string): 'correct' | 'wrong' | null {
    if (!results) return null
    if (!(itemId in results)) return null
    return results[itemId] ? 'correct' : 'wrong'
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {/* Left column: items */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Items
          </p>
          {data.items.map(item => {
            const isSelected = selectedItem === item.id
            const matchedTo = matches[item.id]
            const matchedCat = categories.find(c => c.id === matchedTo)
            const res = itemResult(item.id)
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                disabled={checked}
                className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm font-medium min-h-[48px] transition-colors touch-manipulation flex items-center gap-2 ${
                  res === 'correct'
                    ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-200'
                    : res === 'wrong'
                    ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200'
                    : isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-200'
                    : matchedTo
                    ? 'border-calm-300 dark:border-slate-500 bg-calm-50 dark:bg-slate-700 text-slate-900 dark:text-white'
                    : 'border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white hover:border-primary-300 dark:hover:border-primary-600'
                }`}
              >
                {res === 'correct' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                {res === 'wrong' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="h-8 w-8 object-contain rounded" />
                )}
                <span className="flex-1">{item.label}</span>
                {matchedCat && !checked && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: matchedCat.color || '#6366f1' }}
                  >
                    {matchedCat.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Right column: targets */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Matches
          </p>
          {categories.map(cat => {
            const isUsed = matchedCategoryIds.has(cat.id)
            const isSelectable = selectedItem && !isUsed && !checked
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                disabled={!isSelectable}
                className={`w-full text-left px-3 py-2.5 rounded-xl border-2 text-sm font-medium min-h-[48px] transition-colors touch-manipulation ${
                  isUsed
                    ? 'border-calm-300 dark:border-slate-500 bg-calm-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    : isSelectable
                    ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-slate-900 dark:text-white hover:border-primary-500 cursor-pointer'
                    : 'border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                }`}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full mr-2 align-middle"
                  style={{ backgroundColor: cat.color || '#6366f1' }}
                />
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hint */}
      {selectedItem && !checked && (
        <p className="text-xs text-primary-600 dark:text-primary-400 mt-2">
          Now click a match on the right to pair it.
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4">
        {!checked && (
          <button
            onClick={() => onCheck(matches)}
            disabled={Object.keys(matches).length !== data.items.length}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[48px]"
          >
            Check answers
          </button>
        )}
        {checked && results && Object.values(results).some(v => !v) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-calm-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors min-h-[48px]"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Order variant ───────────────────────────────────────────────────────────

function OrderVariant({
  data,
  checked,
  results,
  onCheck,
  onReset,
}: {
  data: DragDropData
  checked: boolean
  results: Record<string, boolean> | null
  onCheck: (orderedIds: string[]) => void
  onReset: () => void
}) {
  const [orderedItems, setOrderedItems] = useState<DragItem[]>(() => [...data.items])
  const dragRef = useRef<DragState>({ ...initialDragState })
  const [dragTransform, setDragTransform] = useState<{ itemId: string; x: number; y: number } | null>(null)
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  function handlePointerDown(e: React.PointerEvent, itemId: string) {
    if (checked) return
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    dragRef.current = {
      active: true,
      itemId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 0,
      offsetY: 0,
    }
    setDragTransform({ itemId, x: 0, y: 0 })
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current.active) return
    const dy = e.clientY - dragRef.current.startY
    setDragTransform({ itemId: dragRef.current.itemId, x: 0, y: dy })
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!dragRef.current.active) return
    const { itemId } = dragRef.current
    const dy = e.clientY - dragRef.current.startY
    dragRef.current = { ...initialDragState }
    setDragTransform(null)

    // Determine new index based on movement distance
    setOrderedItems(prev => {
      const currentIdx = prev.findIndex(item => item.id === itemId)
      if (currentIdx === -1) return prev

      // Estimate how many positions to move based on approximate item height (56px)
      const positions = Math.round(dy / 56)
      if (positions === 0) return prev

      const newIdx = Math.max(0, Math.min(prev.length - 1, currentIdx + positions))
      if (newIdx === currentIdx) return prev

      const next = [...prev]
      const [moved] = next.splice(currentIdx, 1)
      next.splice(newIdx, 0, moved)
      return next
    })
  }

  function itemResult(itemId: string): 'correct' | 'wrong' | null {
    if (!results) return null
    if (!(itemId in results)) return null
    return results[itemId] ? 'correct' : 'wrong'
  }

  function handleReset() {
    setOrderedItems([...data.items])
    onReset()
  }

  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
        Drag to reorder
      </p>
      <div className="space-y-1.5" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
        {orderedItems.map((item, idx) => {
          const isDragging = dragTransform?.itemId === item.id
          const res = itemResult(item.id)
          return (
            <div
              key={item.id}
              ref={el => { if (el) itemRefs.current.set(item.id, el); else itemRefs.current.delete(item.id) }}
              onPointerDown={e => handlePointerDown(e, item.id)}
              className={`select-none cursor-grab active:cursor-grabbing rounded-xl border-2 px-3 py-2.5 text-sm font-medium min-h-[48px] flex items-center gap-2 transition-colors touch-manipulation ${
                res === 'correct'
                  ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/30 text-green-900 dark:text-green-200'
                  : res === 'wrong'
                  ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200'
                  : 'border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
              }`}
              style={{
                touchAction: 'none',
                userSelect: 'none',
                transform: isDragging ? `translate(0px, ${dragTransform.y}px)` : undefined,
                zIndex: isDragging ? 50 : undefined,
                position: 'relative',
              }}
            >
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold w-5">{idx + 1}</span>
              <GripVertical className="h-4 w-4 text-slate-400 flex-shrink-0" />
              {res === 'correct' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
              {res === 'wrong' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
              {item.imageUrl && (
                <img src={item.imageUrl} alt="" className="h-8 w-8 object-contain rounded" />
              )}
              <span className="flex-1">{item.label}</span>
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-4">
        {!checked && (
          <button
            onClick={() => onCheck(orderedItems.map(i => i.id))}
            className="px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors min-h-[48px]"
          >
            Check answers
          </button>
        )}
        {checked && results && Object.values(results).some(v => !v) && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-calm-200 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-calm-50 dark:hover:bg-slate-700 transition-colors min-h-[48px]"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function DragDropActivity({ title, instructions, data, completed, onComplete }: DragDropActivityProps) {
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<Record<string, boolean> | null>(null)
  const [hasCompleted, setHasCompleted] = useState(completed)

  function handleCheckCategorizeOrMatch(placements: Record<string, string>) {
    const correctMatches = data.correctMatches ?? {}
    const itemResults: Record<string, boolean> = {}
    for (const item of data.items) {
      itemResults[item.id] = placements[item.id] === correctMatches[item.id]
    }
    setResults(itemResults)
    setChecked(true)

    if (Object.values(itemResults).every(Boolean) && !hasCompleted) {
      setHasCompleted(true)
      onComplete()
    }
  }

  function handleCheckOrder(orderedIds: string[]) {
    const correctOrder = data.correctOrder ?? []
    const itemResults: Record<string, boolean> = {}
    for (let i = 0; i < orderedIds.length; i++) {
      itemResults[orderedIds[i]] = orderedIds[i] === correctOrder[i]
    }
    setResults(itemResults)
    setChecked(true)

    if (Object.values(itemResults).every(Boolean) && !hasCompleted) {
      setHasCompleted(true)
      onComplete()
    }
  }

  function handleReset() {
    setChecked(false)
    setResults(null)
  }

  return (
    <div className="my-6">
      <BlockInstructions title={title} instructions={instructions} />

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 p-5">
        {data.variant === 'categorize' && (
          <CategorizeVariant
            data={data}
            checked={checked}
            results={results}
            onCheck={handleCheckCategorizeOrMatch}
            onReset={handleReset}
          />
        )}
        {data.variant === 'match' && (
          <MatchVariant
            data={data}
            checked={checked}
            results={results}
            onCheck={handleCheckCategorizeOrMatch}
            onReset={handleReset}
          />
        )}
        {data.variant === 'order' && (
          <OrderVariant
            data={data}
            checked={checked}
            results={results}
            onCheck={handleCheckOrder}
            onReset={handleReset}
          />
        )}

        {/* Result summary */}
        {checked && results && (
          <div
            className={`mt-4 rounded-lg border p-3 text-sm font-medium ${
              Object.values(results).every(Boolean)
                ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200'
                : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
            }`}
            role="status"
            aria-live="polite"
          >
            {Object.values(results).every(Boolean) ? (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                All correct — well done!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {Object.values(results).filter(Boolean).length} of {Object.values(results).length} correct. Have another go!
              </span>
            )}
          </div>
        )}
      </div>

      <BlockCompletionBadge completed={hasCompleted} />
    </div>
  )
}
