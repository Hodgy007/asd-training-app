'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { InteractiveBlock, InteractiveBlockType, ScenarioData } from '@/types/interactive'
import { BlockTypePicker } from './block-type-picker'
import { ScenarioBuilder } from './scenario-builder'

interface InteractiveBlocksPanelProps {
  blocks: InteractiveBlock[]
  onChange: (blocks: InteractiveBlock[]) => void
  onInsertPlaceholder: (blockId: string, title: string) => void
}

function generateBlockId() {
  return 'blk-' + Math.random().toString(36).slice(2, 9)
}

function createDefaultBlock(type: InteractiveBlockType): InteractiveBlock {
  const id = generateBlockId()
  const base = { id, type, title: '', instructions: '', order: 0 }

  switch (type) {
    case 'scenario': {
      const startId = 'node-start'
      const data: ScenarioData = {
        startNodeId: startId,
        nodes: [
          { id: startId, text: '', choices: [] },
        ],
      }
      return { ...base, data }
    }
    case 'drag-drop':
      return { ...base, data: { variant: 'categorize', items: [] } }
    case 'hotspot':
      return { ...base, data: { variant: 'card-reveal', cards: [] } }
  }
}

export function InteractiveBlocksPanel({ blocks, onChange, onInsertPlaceholder }: InteractiveBlocksPanelProps) {
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null)

  function addBlock(type: InteractiveBlockType) {
    const block = createDefaultBlock(type)
    block.order = blocks.length
    onChange([...blocks, block])
    setExpandedBlockId(block.id)
    setShowTypePicker(false)
    // Insert placeholder into Quill content
    onInsertPlaceholder(block.id, block.title || 'New interactive block')
  }

  function updateBlock(updated: InteractiveBlock) {
    onChange(blocks.map(b => b.id === updated.id ? updated : b))
  }

  function deleteBlock(blockId: string) {
    onChange(blocks.filter(b => b.id !== blockId))
    if (expandedBlockId === blockId) setExpandedBlockId(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Interactive Blocks ({blocks.length})
        </h3>
        <button
          onClick={() => setShowTypePicker(true)}
          className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add block
        </button>
      </div>

      {blocks.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          No interactive blocks yet. Add one to embed an activity within the lesson content.
        </p>
      )}

      {blocks.map(block => (
        <div key={block.id} className="border border-calm-200 dark:border-slate-600 rounded-xl overflow-hidden">
          {/* Block header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-calm-50 dark:bg-slate-700/50">
            <button
              onClick={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
              className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white"
            >
              {expandedBlockId === block.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="text-xs px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded font-semibold uppercase">
                {block.type}
              </span>
              {block.title || <span className="text-slate-400 italic">Untitled</span>}
            </button>
            <button
              onClick={() => deleteBlock(block.id)}
              className="text-red-400 hover:text-red-600 p-1"
              title="Delete block"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Block editor */}
          {expandedBlockId === block.id && (
            <div className="p-4 border-t border-calm-200 dark:border-slate-600">
              {block.type === 'scenario' && (
                <ScenarioBuilder block={block} onChange={updateBlock} />
              )}
              {block.type === 'drag-drop' && (
                <p className="text-sm text-slate-400">Drag-and-drop builder coming in Phase 2.</p>
              )}
              {block.type === 'hotspot' && (
                <p className="text-sm text-slate-400">Hotspot builder coming in Phase 3.</p>
              )}
            </div>
          )}
        </div>
      ))}

      {showTypePicker && (
        <BlockTypePicker onSelect={addBlock} onClose={() => setShowTypePicker(false)} />
      )}
    </div>
  )
}
