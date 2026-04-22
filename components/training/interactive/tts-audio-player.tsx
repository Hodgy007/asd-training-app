'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, AudioLines, Loader2 } from 'lucide-react'

interface TtsAudioPlayerProps {
  text: string
  // Optional label for screen readers, e.g. "Read instructions aloud".
  ariaLabel?: string
}

const SPEEDS = [1, 1.25, 1.5, 0.75] as const

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TtsAudioPlayer({ text, ariaLabel }: TtsAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const [hasAudio, setHasAudio] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [muted, setMuted] = useState(false)

  // Fetch TTS audio on first play click. Not on mount — we don't want to burn
  // ElevenLabs credits on pages the learner doesn't listen to.
  const ensureAudio = useCallback(async (): Promise<string | null> => {
    if (audioUrlRef.current) return audioUrlRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not load audio.')
      }
      const contentType = res.headers.get('content-type') || ''
      const rawBlob = await res.blob()
      if (rawBlob.size === 0) {
        throw new Error('Audio response was empty.')
      }
      if (!contentType.toLowerCase().startsWith('audio/')) {
        throw new Error(`Unexpected audio type: ${contentType || 'unknown'}`)
      }
      // Re-wrap with an explicit type — some proxies/edges can strip the
      // Content-Type when transporting binary payloads; pinning it here
      // ensures the <audio> element picks the right decoder.
      const blob = new Blob([await rawBlob.arrayBuffer()], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      audioUrlRef.current = url
      setHasAudio(true)
      return url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load audio.')
      return null
    } finally {
      setLoading(false)
    }
  }, [text])

  // Reset when the text changes (e.g. different interactive block).
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setHasAudio(false)
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setError(null)
  }, [text])

  // Revoke the blob URL on unmount.
  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      return
    }

    if (!audioUrlRef.current) {
      const url = await ensureAudio()
      if (!url) return
      audio.src = url
      audio.playbackRate = speed
      audio.muted = muted
    }

    try {
      await audio.play()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Playback blocked.')
    }
  }, [ensureAudio, muted, playing, speed])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const pct = Number(e.target.value) / 1000
    const next = pct * duration
    audio.currentTime = next
    setCurrentTime(next)
  }, [duration])

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed)
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }, [speed])

  const toggleMute = useCallback(() => {
    const next = !muted
    setMuted(next)
    if (audioRef.current) audioRef.current.muted = next
  }, [muted])

  const progressPct = duration > 0 ? (currentTime / duration) * 1000 : 0

  return (
    <div
      role="region"
      aria-label={ariaLabel || 'Read aloud'}
      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/70 dark:bg-slate-900/40 border border-calm-200 dark:border-slate-700"
    >
      <AudioLines className="h-4 w-4 text-slate-500 dark:text-slate-400 flex-shrink-0" aria-hidden="true" />

      <button
        type="button"
        onClick={handlePlayPause}
        disabled={loading}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex items-center justify-center h-8 w-8 rounded-full text-slate-800 dark:text-slate-100 hover:bg-calm-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors flex-shrink-0"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" fill="currentColor" />
        ) : (
          <Play className="h-4 w-4" fill="currentColor" />
        )}
      </button>

      <input
        type="range"
        min={0}
        max={1000}
        value={progressPct}
        onChange={handleSeek}
        disabled={!duration}
        aria-label="Seek"
        className="flex-1 h-1 accent-slate-800 dark:accent-slate-200 cursor-pointer"
      />

      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums flex-shrink-0 min-w-[2.75rem] text-right">
        {formatTime(duration - currentTime)}
      </span>

      <button
        type="button"
        onClick={cycleSpeed}
        aria-label={`Playback speed ${speed}x`}
        className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex-shrink-0 w-8 text-center"
      >
        {speed}x
      </button>

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? 'Unmute' : 'Mute'}
        className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors flex-shrink-0"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      <audio
        ref={audioRef}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0) }}
        onError={(e) => {
          const mediaErr = (e.currentTarget as HTMLAudioElement).error
          const code = mediaErr?.code
          // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED — blob URL opened but the bytes
          // weren't decodable as audio. Invalidate the cached URL so the
          // learner can retry (and the next fetch will go to the server,
          // bypassing any bad blob that somehow got created).
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current)
            audioUrlRef.current = null
          }
          setHasAudio(false)
          setPlaying(false)
          setError(
            code === 4
              ? 'Audio format not supported. Please try again.'
              : mediaErr?.message || 'Audio playback failed.'
          )
        }}
        preload="metadata"
        className="sr-only"
        aria-hidden={!hasAudio}
      />

      {error && (
        <span role="alert" className="text-xs text-red-500 ml-1">
          {error}
        </span>
      )}
    </div>
  )
}
