'use client'

import { useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'

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

function requestFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) {
    el.requestFullscreen()
  } else if ('webkitRequestFullscreen' in el) {
    (el as any).webkitRequestFullscreen()
  } else if ('msRequestFullscreen' in el) {
    (el as any).msRequestFullscreen()
  }
}

export function VideoPlayer({ title, videoUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showControls, setShowControls] = useState(false)

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v || !v.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current
    if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    v.currentTime = ratio * v.duration
  }

  function handleFullscreen() {
    const v = videoRef.current
    // iOS Safari: use webkitEnterFullscreen on the video element directly
    if (v && 'webkitEnterFullscreen' in v) {
      (v as any).webkitEnterFullscreen()
      return
    }
    // Standard: fullscreen the container div
    if (containerRef.current) {
      requestFullscreen(containerRef.current)
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
      <div
        ref={containerRef}
        className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video [&:fullscreen]:rounded-none"
      >
        <iframe
          src={embedUrl}
          title={title}
          className="w-full h-full absolute inset-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    )
  }

  // Direct video file: use native player
  return (
    <div
      ref={containerRef}
      className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video group [&:fullscreen]:rounded-none"
      onTouchStart={() => setShowControls(true)}
      onTouchEnd={() => setTimeout(() => setShowControls(false), 3000)}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        onClick={togglePlay}
        playsInline
      />

      {/* Play overlay when paused */}
      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-black/70 transition-colors">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls bar - visible on hover (desktop) and touch (mobile) */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        {/* Progress bar */}
        <div
          className="w-full h-1.5 bg-white/30 rounded-full mb-3 cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="text-white hover:text-primary-400 transition-colors"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing
                ? <Pause className="h-5 w-5" />
                : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={toggleMute}
              className="text-white hover:text-primary-400 transition-colors"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted
                ? <VolumeX className="h-5 w-5" />
                : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="text-white/70 text-xs hidden sm:inline">{title}</span>
          </div>
          <button
            onClick={handleFullscreen}
            className="text-white hover:text-primary-400 transition-colors"
            aria-label="Fullscreen"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
