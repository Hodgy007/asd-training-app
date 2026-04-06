'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { ScenarioNode, ScenarioChoice } from '@/types/interactive'

interface ScenarioNodeEditorProps {
  node: ScenarioNode
  allNodeIds: string[]
  onChange: (updated: ScenarioNode) => void
  onDelete: () => void
  isStart: boolean
}

function generateId() {
  return 'c-' + Math.random().toString(36).slice(2, 9)
}

export function ScenarioNodeEditor({ node, allNodeIds, onChange, onDelete, isStart }: ScenarioNodeEditorProps) {
  const [expanded, setExpanded] = useState(true)

  function updateField<K extends keyof ScenarioNode>(key: K, value: ScenarioNode[K]) {
    onChange({ ...node, [key]: value })
  }

  function addChoice() {
    const newChoice: ScenarioChoice = { id: generateId(), label: '', nextNodeId: '' }
    onChange({ ...node, choices: [...(node.choices ?? []), newChoice], isEnding: false })
  }

  function updateChoice(idx: number, updated: ScenarioChoice) {
    const choices = [...(node.choices ?? [])]
    choices[idx] = updated
    onChange({ ...node, choices })
  }

  function removeChoice(idx: number) {
    const choices = (node.choices ?? []).filter((_, i) => i !== idx)
    onChange({ ...node, choices })
  }

  return (
    <div className="border border-calm-200 dark:border-slate-600 rounded-xl p-4 bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {node.id}
          {isStart && <span className="text-xs text-primary-500 font-normal">(start)</span>}
          {node.isEnding && <span className="text-xs text-green-500 font-normal">(ending)</span>}
        </button>
        {!isStart && (
          <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-3 mt-3">
          {/* Node text */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Text / Situation</label>
            <textarea
              value={node.text}
              onChange={e => updateField('text', e.target.value)}
              className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white min-h-[60px]"
              placeholder="Describe the situation..."
            />
          </div>

          {/* Ending toggle */}
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={node.isEnding ?? false}
              onChange={e => {
                const isEnding = e.target.checked
                onChange({ ...node, isEnding, choices: isEnding ? [] : node.choices })
              }}
              className="rounded border-calm-300 dark:border-slate-500"
            />
            This is an ending node
          </label>

          {/* Ending config */}
          {node.isEnding && (
            <div className="space-y-2 pl-4 border-l-2 border-green-300 dark:border-green-700">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Ending Type</label>
                <select
                  value={node.endingType ?? 'neutral'}
                  onChange={e => updateField('endingType', e.target.value as 'positive' | 'neutral' | 'negative')}
                  className="rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-white"
                >
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Feedback Message</label>
                <textarea
                  value={node.feedback ?? ''}
                  onChange={e => updateField('feedback', e.target.value)}
                  className="w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white min-h-[40px]"
                  placeholder="What the learner sees at this ending..."
                />
              </div>
            </div>
          )}

          {/* Choices */}
          {!node.isEnding && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Choices ({(node.choices ?? []).length})
              </label>
              <div className="space-y-2">
                {(node.choices ?? []).map((choice, idx) => (
                  <div key={choice.id} className="flex items-start gap-2 bg-calm-50 dark:bg-slate-700 rounded-lg p-2">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={choice.label}
                        onChange={e => updateChoice(idx, { ...choice, label: e.target.value })}
                        className="w-full rounded border border-calm-200 dark:border-slate-500 bg-white dark:bg-slate-600 px-2 py-1 text-sm text-slate-900 dark:text-white"
                        placeholder="Choice text..."
                      />
                      <select
                        value={choice.nextNodeId}
                        onChange={e => updateChoice(idx, { ...choice, nextNodeId: e.target.value })}
                        className="w-full rounded border border-calm-200 dark:border-slate-500 bg-white dark:bg-slate-600 px-2 py-1 text-xs text-slate-700 dark:text-slate-300"
                      >
                        <option value="">→ Goes to...</option>
                        {allNodeIds.filter(id => id !== node.id).map(id => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={() => removeChoice(idx)} className="text-red-400 hover:text-red-600 p-1 mt-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addChoice}
                className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium mt-2 hover:underline"
              >
                <Plus className="h-3 w-3" /> Add choice
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
