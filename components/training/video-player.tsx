'use client'

import { useState } from 'react'
import { Play, Video } from 'lucide-react'

interface VideoPlayerProps {
  title: string
}

export function VideoPlayer({ title }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
      {!playing ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-white/50 text-xs mt-1">Video lesson</p>
          <button
            onClick={() => setPlaying(true)}
            className="mt-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Play lesson video
          </button>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800">
          <Video className="h-12 w-12 text-white/30 mb-3" />
          <p className="text-white/60 text-sm">Video player placeholder</p>
          <p className="text-white/40 text-xs mt-1">
            In production, embed your video hosting URL here
          </p>
          <button
            onClick={() => setPlaying(false)}
            className="mt-4 text-white/60 hover:text-white text-xs underline transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}
