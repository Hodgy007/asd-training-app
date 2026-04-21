'use client'

import { useEffect, useRef } from 'react'
import { VideoData } from '@/types/interactive'
import { VideoPlayer } from '@/components/training/video-player'
import { BlockInstructions } from './block-instructions'

interface VideoBlockProps {
  title: string
  instructions: string
  data: VideoData
  completed: boolean
  onComplete: () => void
}

export function VideoBlock({ title, instructions, data, completed, onComplete }: VideoBlockProps) {
  const seenRef = useRef(completed)

  // Mark as viewed when the block scrolls into view. Watching a video isn't
  // something we can reliably detect without a lot of extra complexity, so
  // treat "the learner got here" as completion for progress-tracking purposes.
  useEffect(() => {
    if (seenRef.current) return
    const t = setTimeout(() => {
      if (!seenRef.current) {
        seenRef.current = true
        onComplete()
      }
    }, 2000)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div className="my-6">
      <BlockInstructions title={title} instructions={instructions} />
      {data.url ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 overflow-hidden">
          <VideoPlayer title={title} videoUrl={data.url} />
          {data.caption && (
            <p className="text-sm text-slate-600 dark:text-slate-400 px-4 py-3 border-t border-calm-200 dark:border-slate-700">
              {data.caption}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-calm-50 dark:bg-slate-800 rounded-xl border border-dashed border-calm-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No video has been added to this block yet.
        </div>
      )}
    </div>
  )
}
