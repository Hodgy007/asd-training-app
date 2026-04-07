'use client'

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

  // Direct video file (Vercel Blob, etc.): native controls with fullscreen support
  // No border-radius on the video element itself — it clips the native
  // fullscreen button that sits in the bottom-right corner on mobile.
  return (
    <video
      src={videoUrl}
      title={title}
      className="w-full bg-black sm:rounded-2xl"
      controls
      playsInline
      preload="auto"
    />
  )
}
