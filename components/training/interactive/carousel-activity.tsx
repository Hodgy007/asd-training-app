'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { CarouselData } from '@/types/interactive'
import { sanitizeHtml } from '@/lib/sanitize'
import { BlockInstructions } from './block-instructions'
import { BlockCompletionBadge } from './block-completion-badge'
import { TtsAudioPlayer } from './tts-audio-player'
import { buildCarouselSlideTtsText } from '@/lib/tts-extract'

interface CarouselActivityProps {
  title: string
  instructions: string
  data: CarouselData
  completed: boolean
  onComplete: () => void
}

const SWIPE_THRESHOLD_PX = 40

export function CarouselActivity({
  title,
  instructions,
  data,
  completed,
  onComplete,
}: CarouselActivityProps) {
  const slides = data.slides ?? []
  const [activeIdx, setActiveIdx] = useState(0)
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => new Set(slides[0] ? [slides[0].id] : []))
  const touchStartX = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const safeIdx = Math.min(activeIdx, Math.max(slides.length - 1, 0))
  const slide = slides[safeIdx]
  const hasSlides = slides.length > 0

  // Per-slide TTS text — only computed when the author opted in via the
  // readAloud flag. Each slide's text hashes to its own Blob entry, so the
  // player only reads what's currently on screen (no more "all slides at
  // once"). The buildCarouselSlideTtsText helper is shared with the server-
  // side prewarm so both sides produce identical sha256 cache keys.
  const slideReadAloudText =
    data.readAloud && slide ? buildCarouselSlideTtsText(slide) : ''

  // Fire completion once the learner has visited every slide.
  useEffect(() => {
    if (!hasSlides || completed) return
    if (visitedIds.size === slides.length) {
      onComplete()
    }
  }, [visitedIds, slides.length, hasSlides, completed, onComplete])

  function goTo(idx: number) {
    if (idx < 0 || idx >= slides.length) return
    setActiveIdx(idx)
    const id = slides[idx]?.id
    if (id) {
      setVisitedIds((prev) => {
        if (prev.has(id)) return prev
        const next = new Set(prev)
        next.add(id)
        return next
      })
    }
  }

  function goPrev() {
    goTo(safeIdx - 1)
  }

  function goNext() {
    goTo(safeIdx + 1)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartX.current
    touchStartX.current = null
    if (start == null) return
    const end = e.changedTouches[0]?.clientX
    if (end == null) return
    const dx = end - start
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return
    if (dx > 0) goPrev()
    else goNext()
  }

  if (!hasSlides || !slide) {
    return (
      <div className="my-6">
        <BlockInstructions title={title} instructions={instructions} />
        <div className="card text-sm text-slate-500 dark:text-slate-400">
          This carousel has no slides yet.
        </div>
      </div>
    )
  }

  const atStart = safeIdx === 0
  const atEnd = safeIdx === slides.length - 1

  const chevronBase = 'w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0'
  const chevronEnabled = 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white'
  const chevronDisabled = 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'

  return (
    <div className="my-6">
      <BlockInstructions title={title} instructions={instructions} />

      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="group"
        aria-roledescription="carousel"
        aria-label={title || 'Carousel'}
        className="rounded-2xl border border-calm-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 overflow-hidden"
      >
        {/* Slide content */}
        <div className="p-6 sm:p-8">
          {slideReadAloudText && (
            // Keyed on slide.id so the player fully resets (pauses, drops
            // the previous blob URL, re-fetches the new slide's MP3) when
            // the learner navigates between slides.
            <div className="mb-4">
              <TtsAudioPlayer
                key={slide.id}
                text={slideReadAloudText}
                ariaLabel={
                  slide.title
                    ? `Read slide "${slide.title}" aloud`
                    : `Read slide ${safeIdx + 1} aloud`
                }
              />
            </div>
          )}
          {slide.title && (
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {slide.title}
            </h3>
          )}
          {slide.imageUrl && (
            <div className="rounded-xl overflow-hidden mb-4 bg-calm-100 dark:bg-slate-700">
              <img
                src={slide.imageUrl}
                alt={slide.title || ''}
                className="w-full h-auto block"
              />
            </div>
          )}
          {slide.body && (
            <div
              className="prose-lesson text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(slide.body) }}
            />
          )}
        </div>

        {/* Footer: prev, numbered pagination, next — fixed in layout so controls never shift */}
        <div className="flex items-center justify-between gap-3 px-4 pb-5 pt-2 border-t border-calm-100 dark:border-slate-700/60">
          <button
            type="button"
            onClick={goPrev}
            disabled={atStart}
            aria-label="Previous slide"
            className={clsx(chevronBase, atStart ? chevronDisabled : chevronEnabled)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            {slides.map((s, idx) => {
              const isActive = idx === safeIdx
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => goTo(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={clsx(
                    'text-sm font-medium transition-all w-7 h-7 rounded-full flex items-center justify-center',
                    isActive
                      ? 'border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={atEnd}
            aria-label="Next slide"
            className={clsx(chevronBase, atEnd ? chevronDisabled : chevronEnabled)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <BlockCompletionBadge completed={completed} />
    </div>
  )
}
