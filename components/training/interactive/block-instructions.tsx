'use client'

import { Info } from 'lucide-react'
import { TtsAudioPlayer } from './tts-audio-player'

interface BlockInstructionsProps {
  title: string
  instructions: string
  /**
   * Optional extra text to append to the TTS player's script — e.g. a
   * hotspot's revealed content or a carousel's slide bodies. When provided,
   * the top-of-block audio player reads title + instructions + this text as a
   * single narration, which is what learners expect: hit play once at the top
   * and hear the whole block spoken aloud before interacting with it.
   */
  readAloudText?: string
}

export function BlockInstructions({ title, instructions, readAloudText }: BlockInstructionsProps) {
  const hasTitle = Boolean(title?.trim())
  const hasInstructions = Boolean(instructions?.trim())
  const hasReadAloud = Boolean(readAloudText?.trim())
  if (!hasTitle && !hasInstructions && !hasReadAloud) return null

  // The order (title → instructions → content) matches how a sighted learner
  // would scan the block, and it matches `buildBlockTtsText` in lib/tts-extract
  // so the server-side prewarm produces the exact same sha256 key.
  const ttsText = [title, instructions, readAloudText].filter((s) => Boolean(s?.trim())).join('. ')
  const ariaLabel = title ? `Read "${title}" aloud` : 'Read this block aloud'

  return (
    <div className="mb-4 space-y-2">
      {ttsText && <TtsAudioPlayer text={ttsText} ariaLabel={ariaLabel} />}
      {(hasTitle || hasInstructions) && (
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
      )}
    </div>
  )
}
