'use client'

import { useCallback } from 'react'
import { InteractiveBlock, ScenarioData, InteractionData } from '@/types/interactive'
import { ScenarioPlayer } from './scenario-player'

interface InteractiveBlockRendererProps {
  block: InteractiveBlock
  interactionData: InteractionData
  lessonId: string
  moduleId: string
  onBlockComplete: (blockId: string) => void
}

export function InteractiveBlockRenderer({
  block,
  interactionData,
  onBlockComplete,
}: InteractiveBlockRendererProps) {
  const blockProgress = interactionData[block.id]
  const completed = blockProgress?.completed ?? false

  const handleComplete = useCallback(() => {
    onBlockComplete(block.id)
  }, [block.id, onBlockComplete])

  switch (block.type) {
    case 'scenario':
      return (
        <ScenarioPlayer
          title={block.title}
          instructions={block.instructions}
          data={block.data as ScenarioData}
          completed={completed}
          onComplete={handleComplete}
        />
      )

    case 'drag-drop':
      // Phase 2 — placeholder
      return (
        <div className="my-6 p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-center text-slate-400 dark:text-slate-500 text-sm">
          Drag-and-drop activity: {block.title} (coming soon)
        </div>
      )

    case 'hotspot':
      // Phase 3 — placeholder
      return (
        <div className="my-6 p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-center text-slate-400 dark:text-slate-500 text-sm">
          Hotspot activity: {block.title} (coming soon)
        </div>
      )

    default:
      return null
  }
}
