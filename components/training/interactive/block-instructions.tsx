'use client'

import { Info } from 'lucide-react'
import { TtsAudioPlayer } from './tts-audio-player'

interface BlockInstructionsProps {
  title: string
  instructions: string
}

export function BlockInstructions({ title, instructions }: BlockInstructionsProps) {
  const hasTitle = Boolean(title?.trim())
  const hasInstructions = Boolean(instructions?.trim())
  if (!hasTitle && !hasInstructions) return null

  const ttsText = [title, instructions].filter(Boolean).join('. ')

  return (
    <div className="mb-4 space-y-2">
      {ttsText && (
        <TtsAudioPlayer text={ttsText} ariaLabel={`Read "${title}" aloud`} />
      )}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4">
        {hasTitle && (
          <h3 className="font-bold text-primary-800 dark:text-primary-200 text-lg mb-1 flex items-center gap-2">
            <Info className="h-5 w-5 flex-shrink-0" />
            {title}
          </h3>
        )}
        {hasInstructions && (
          <p className="text-sm text-primary-700 dark:text-primary-300">{instructions}</p>
        )}
      </div>
    </div>
  )
}
