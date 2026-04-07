'use client'

import { useRef } from 'react'
import { Maximize } from 'lucide-react'

interface VideoPlayerProps {
  title: string
  videoUrl?: string
}

function getEmbedUrl(url: string): string | null {
  // YouTube: watch URLs, short URLs, and embed URLs
  const ytWatch = url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/)([\w-]+)/)
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`
  if (/youtube\.com\/embed\//.test(url)) return url

  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  if (/player\.vimeo\.com\/video\//.test(url)) return url

  return null
}

export function VideoPlayer({ title, videoUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  function goFullscreen() {
    const v = videoRef.current
    if (!v) return

    // Try every known fullscreen method
    if (typeof (v as any).webkitEnterFullscreen === 'function') {
      // iOS Safari — must be called on the video element
      (v as any).webkitEnterFullscreen()
    } else if (v.requestFullscreen) {
      v.requestFullscreen()
    } else if (typeof (v as any).webkitRequestFullscreen === 'function') {
      (v as any).webkitRequestFullscreen()
    } else if (typeof (v as any).mozRequestFullScreen === 'function') {
      (v as any).mozRequestFullScreen()
    } else if (typeof (v as any).msRequestFullscreen === 'function') {
      (v as any).msRequestFullscreen()
    }
  }

  if (!videoUrl) {
    return (
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-sm">Video lesson</p>
          <p className="text-white/40 text-xs mt-1">No video uploaded yet</p>
        </div>
      </div>
    )
  }

  const embedUrl = getEmbedUrl(videoUrl)

  // YouTube/Vimeo: use iframe embed
  if (embedUrl) {
    return (
      <div className="relative bg-slate-900 rounded-2xl aspect-video">
        <iframe
          src={embedUrl}
          title={title}
          className="absolute inset-0 w-full h-full rounded-2xl"
          style={{ border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen; web-share"
          allowFullScreen
        />
      </div>
    )
  }

  // Direct video file with native controls + explicit fullscreen button
  return (
    <div className="space-y-2">
      <video
        ref={videoRef}
        src={videoUrl}
        title={title}
        className="w-full bg-black sm:rounded-2xl"
        controls
        playsInline
        preload="auto"
      />
      <button
        type="button"
        onClick={goFullscreen}
        className="flex items-center gap-2 px-4 py-2.5 w-full sm:w-auto rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
      >
        <Maximize className="h-4 w-4" />
        Watch fullscreen
      </button>
    </div>
  )
}
