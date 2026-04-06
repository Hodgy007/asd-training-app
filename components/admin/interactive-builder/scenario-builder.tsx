'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { InteractiveBlock, ScenarioData, ScenarioNode } from '@/types/interactive'
import { ScenarioNodeEditor } from './scenario-node-editor'

interface ScenarioBuilderProps {
  block: InteractiveBlock
  onChange: (updated: InteractiveBlock) => void
}

function generateNodeId() {
  return 'node-' + Math.random().toString(36).slice(2, 7)
}

export function ScenarioBuilder({ block, onChange }: ScenarioBuilderProps) {
  const data = block.data as ScenarioData
  const [titleEdit, setTitleEdit] = useState(block.title)
  const [instructionsEdit, setInstructionsEdit] = useState(block.instructions)

  function updateData(updated: ScenarioData) {
    onChange({ ...block, data: updated })
  }

  function updateNode(nodeId: string, updated: ScenarioNode) {
    const nodes = data.nodes.map(n => n.id === nodeId ? updated : n)
    updateData({ ...data, nodes })
  }

  function deleteNode(nodeId: string) {
    const nodes = data.nodes.filter(n => n.id !== nodeId)
    // Clean up any choices pointing to deleted node
    const cleaned = nodes.map(n => ({
      ...n,
      choices: n.choices?.filter(c => c.nextNodeId !== nodeId),
    }))
    updateData({ ...data, nodes: cleaned })
  }

  function addNode() {
    const newId = generateNodeId()
    const newNode: ScenarioNode = { id: newId, text: '', choices: [] }
    updateData({ ...data, nodes: [...data.nodes, newNode] })
  }

  const allNodeIds = data.nodes.map(n => n.id)

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
            placeholder="e.g. Responding to a concerned parent"
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
            placeholder="Read the scenario and choose how you would respond."
          />
        </div>
      </div>

      {/* Nodes */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
          Scenario Nodes ({data.nodes.length})
        </label>
        <div className="space-y-3">
          {data.nodes.map(node => (
            <ScenarioNodeEditor
              key={node.id}
              node={node}
              allNodeIds={allNodeIds}
              onChange={updated => updateNode(node.id, updated)}
              onDelete={() => deleteNode(node.id)}
              isStart={node.id === data.startNodeId}
            />
          ))}
        </div>
        <button
          onClick={addNode}
          className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 font-medium mt-3 hover:underline"
        >
          <Plus className="h-4 w-4" /> Add node
        </button>
      </div>
    </div>
  )
}
