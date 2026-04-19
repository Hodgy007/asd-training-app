'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Volume2, Pause, Square, Play } from 'lucide-react'

interface TextToSpeechProps {
  contentRef: React.RefObject<HTMLDivElement>
}

type TTSState = 'idle' | 'playing' | 'paused'

const TTS_SELECTORS = 'p, li, h2, h3, td'
const TTS_HIGHLIGHT_CLASS = 'tts-reading'
const LS_KEY = 'tts-enabled'

// Preference list — the first match wins. These are the most natural-sounding
// voices commonly available on Windows/macOS/Chrome. Falls back to any
// en-GB/en-US voice, then to the browser default.
const VOICE_PREFERENCES = [
  // Windows — neural/online voices (much better than "Microsoft David")
  'Microsoft Libby Online',
  'Microsoft Sonia Online',
  'Microsoft Ryan Online',
  'Microsoft Aria Online',
  'Microsoft Jenny Online',
  // macOS / iOS
  'Samantha',
  'Daniel',
  'Karen',
  'Moira',
  // Chrome / Android built-in
  'Google UK English Female',
  'Google UK English Male',
  'Google US English',
]

function pickBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  for (const pref of VOICE_PREFERENCES) {
    const match = voices.find((v) => v.name === pref || v.name.includes(pref))
    if (match) return match
  }
  // Prefer en-GB over en-US; prefer non-local (cloud) voices as they tend to sound better
  const enGb = voices.filter((v) => v.lang?.startsWith('en-GB'))
  const enUs = voices.filter((v) => v.lang?.startsWith('en-US'))
  const en = [...enGb, ...enUs]
  const cloud = en.find((v) => !v.localService)
  if (cloud) return cloud
  return en[0] ?? voices[0] ?? null
}

export function TextToSpeech({ contentRef }: TextToSpeechProps) {
  const [state, setState] = useState<TTSState>('idle')
  const [supported, setSupported] = useState(false)
  const currentIndexRef = useRef(0)
  const elementsRef = useRef<Element[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    setSupported(true)

    // Voice list may load asynchronously (especially on Chrome). Pick on ready.
    const loadVoice = () => {
      voiceRef.current = pickBestVoice()
    }
    loadVoice()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoice)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoice)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        clearHighlight()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearHighlight = useCallback(() => {
    elementsRef.current.forEach(el => {
      el.classList.remove(TTS_HIGHLIGHT_CLASS)
    })
  }, [])

  const speakElement = useCallback((index: number) => {
    const elements = elementsRef.current
    if (index >= elements.length) {
      clearHighlight()
      setState('idle')
      currentIndexRef.current = 0
      return
    }

    clearHighlight()
    const el = elements[index]
    const text = el.textContent?.trim()
    if (!text) {
      currentIndexRef.current = index + 1
      speakElement(index + 1)
      return
    }

    el.classList.add(TTS_HIGHLIGHT_CLASS)
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

    const utterance = new SpeechSynthesisUtterance(text)
    if (voiceRef.current) {
      utterance.voice = voiceRef.current
      utterance.lang = voiceRef.current.lang
    }
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.volume = 1
    utterance.onend = () => {
      currentIndexRef.current = index + 1
      speakElement(index + 1)
    }
    utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        currentIndexRef.current = index + 1
        speakElement(index + 1)
      }
    }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [clearHighlight])

  const handlePlay = useCallback(() => {
    if (!contentRef.current) return

    if (state === 'paused') {
      window.speechSynthesis.resume()
      setState('playing')
      return
    }

    // Starting fresh
    const elements = Array.from(contentRef.current.querySelectorAll(TTS_SELECTORS))
    elementsRef.current = elements
    currentIndexRef.current = 0

    if (elements.length === 0) return

    window.speechSynthesis.cancel()
    setState('playing')
    try {
      localStorage.setItem(LS_KEY, 'true')
    } catch {}
    speakElement(0)
  }, [contentRef, state, speakElement])

  const handlePause = useCallback(() => {
    window.speechSynthesis.pause()
    setState('paused')
  }, [])

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel()
    clearHighlight()
    setState('idle')
    currentIndexRef.current = 0
  }, [clearHighlight])

  if (!supported) return null

  const btnClass =
    'inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300'

  return (
    <>
      {/* Global styles for TTS highlight */}
      <style jsx global>{`
        .${TTS_HIGHLIGHT_CLASS} {
          @apply ring-2 ring-primary-300 bg-primary-50/30 rounded transition;
        }
        .dark .${TTS_HIGHLIGHT_CLASS} {
          @apply ring-primary-600 bg-primary-900/20;
        }
      `}</style>

      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-1">
        {state === 'idle' && (
          <button
            onClick={handlePlay}
            className={`${btnClass} text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30`}
            aria-label="Read aloud"
            title="Read aloud"
          >
            <Volume2 className="h-4 w-4" />
          </button>
        )}
        {state === 'playing' && (
          <>
            <button
              onClick={handlePause}
              className={`${btnClass} text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30`}
              aria-label="Pause reading"
              title="Pause"
            >
              <Pause className="h-4 w-4" />
            </button>
            <button
              onClick={handleStop}
              className={`${btnClass} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30`}
              aria-label="Stop reading"
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </button>
          </>
        )}
        {state === 'paused' && (
          <>
            <button
              onClick={handlePlay}
              className={`${btnClass} text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30`}
              aria-label="Resume reading"
              title="Resume"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              onClick={handleStop}
              className={`${btnClass} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30`}
              aria-label="Stop reading"
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </>
  )
}
