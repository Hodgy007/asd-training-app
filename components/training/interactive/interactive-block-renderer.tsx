'use client'

import { useCallback } from 'react'
import { InteractiveBlock, ScenarioData, KnowledgeCheckData, DragDropData, HotspotData, CarouselData, VideoData, InteractionData } from '@/types/interactive'
import { ScenarioPlayer } from './scenario-player'
import { KnowledgeCheck } from './knowledge-check'
import { DragDropActivity } from './drag-drop-activity'
import { HotspotActivity } from './hotspot-activity'
import { CarouselActivity } from './carousel-activity'
import { VideoBlock } from './video-block'

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
      return (
        <DragDropActivity
          title={block.title}
          instructions={block.instructions}
          data={block.data as DragDropData}
          completed={completed}
          onComplete={handleComplete}
        />
      )

    case 'hotspot':
      return (
        <HotspotActivity
          title={block.title}
          instructions={block.instructions}
          data={block.data as HotspotData}
          completed={completed}
          onComplete={handleComplete}
        />
      )

    case 'knowledge-check':
      return (
        <KnowledgeCheck
          title={block.title}
          instructions={block.instructions}
          data={block.data as KnowledgeCheckData}
          completed={completed}
          onComplete={handleComplete}
        />
      )

    case 'carousel':
      return (
        <CarouselActivity
          title={block.title}
          instructions={block.instructions}
          data={block.data as CarouselData}
          completed={completed}
          onComplete={handleComplete}
        />
      )

    case 'video':
      return (
        <VideoBlock
          title={block.title}
          instructions={block.instructions}
          data={block.data as VideoData}
          completed={completed}
          onComplete={handleComplete}
        />
      )

    default:
      return null
  }
}
