'use client'

import { X, GitBranch, GripVertical, MousePointer, HelpCircle } from 'lucide-react'
import { InteractiveBlockType } from '@/types/interactive'

interface BlockTypePickerProps {
  onSelect: (type: InteractiveBlockType) => void
  onClose: () => void
}

const BLOCK_TYPES: { type: InteractiveBlockType; label: string; description: string; icon: React.ElementType; available: boolean }[] = [
  { type: 'scenario', label: 'Branching Scenario', description: 'Learners make choices and see consequences in a decision tree.', icon: GitBranch, available: true },
  { type: 'drag-drop', label: 'Drag & Drop', description: 'Match items, sort into categories, or put steps in order.', icon: GripVertical, available: false },
  { type: 'hotspot', label: 'Hotspot / Click-to-Reveal', description: 'Click areas on an image or cards to reveal information.', icon: MousePointer, available: false },
  { type: 'knowledge-check', label: 'Knowledge Check', description: 'Quick 1-3 question check embedded mid-lesson with instant feedback.', icon: HelpCircle, available: true },
]

export function BlockTypePicker({ onSelect, onClose }: BlockTypePickerProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Interactive Block</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          {BLOCK_TYPES.map(bt => {
            const Icon = bt.icon
            return (
              <button
                key={bt.type}
                onClick={() => bt.available && onSelect(bt.type)}
                disabled={!bt.available}
                className="w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 border-calm-200 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Icon className="h-5 w-5 text-primary-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">
                    {bt.label}
                    {!bt.available && <span className="ml-2 text-xs text-slate-400 font-normal">(coming soon)</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{bt.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
