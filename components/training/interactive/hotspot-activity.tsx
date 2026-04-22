'use client'

import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { HotspotData, Hotspot, RevealCard } from '@/types/interactive'
import { BlockInstructions } from './block-instructions'
import { BlockCompletionBadge } from './block-completion-badge'
import { buildHotspotReadAloudText } from '@/lib/tts-extract'

interface HotspotActivityProps {
  title: string
  instructions: string
  data: HotspotData
  completed: boolean
  onComplete: () => void
}

// ─── Image Hotspot variant ───────────────────────────────────────────────────

function ImageHotspotVariant({
  data,
  hasCompleted,
  onAllRevealed,
}: {
  data: HotspotData
  hasCompleted: boolean
  onAllRevealed: () => void
}) {
  const hotspots = data.hotspots ?? []
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null)

  function handleDotClick(hotspot: Hotspot) {
    setActiveHotspot(hotspot)
    setRevealedIds(prev => {
      const next = new Set(prev)
      next.add(hotspot.id)
      // Check if all revealed after this addition
      if (next.size === hotspots.length && !hasCompleted) {
        // Use setTimeout to ensure state updates first
        setTimeout(() => onAllRevealed(), 0)
      }
      return next
    })
  }

  function closePopup() {
    setActiveHotspot(null)
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {revealedIds.size} of {hotspots.length} discovered
        </p>
        <div className="flex gap-1">
          {hotspots.map(h => (
            <div
              key={h.id}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                revealedIds.has(h.id)
                  ? 'bg-primary-500'
                  : 'bg-calm-200 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Image container */}
      <div className="relative rounded-xl overflow-hidden border border-calm-200 dark:border-slate-700">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt=""
            className="w-full h-auto block"
          />
        ) : (
          <div className="w-full h-64 bg-calm-100 dark:bg-slate-700 flex items-center justify-center text-sm text-slate-400">
            No image provided
          </div>
        )}

        {/* Hotspot dots */}
        {hotspots.map(hotspot => {
          const isRevealed = revealedIds.has(hotspot.id)
          const isActive = activeHotspot?.id === hotspot.id
          return (
            <button
              key={hotspot.id}
              onClick={() => handleDotClick(hotspot)}
              className={`absolute flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-lg transition-transform hover:scale-110 touch-manipulation ${
                isRevealed
                  ? 'bg-primary-500'
                  : 'bg-amber-400 motion-safe:animate-pulse'
              }`}
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                width: `${Math.max(hotspot.radius * 2, 44)}px`,
                height: `${Math.max(hotspot.radius * 2, 44)}px`,
                transform: 'translate(-50%, -50%)',
                minWidth: '44px',
                minHeight: '44px',
              }}
              aria-label={`Hotspot: ${hotspot.title}${isRevealed ? ' (discovered)' : ''}`}
            >
              <span className="text-white text-xs font-bold">
                {isRevealed ? '\u2713' : '?'}
              </span>
            </button>
          )
        })}

        {/* Popup card */}
        {activeHotspot && (
          <div
            className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-calm-200 dark:border-slate-600 p-4 max-w-xs z-20"
            style={{
              left: `${Math.min(Math.max(activeHotspot.x, 20), 80)}%`,
              top: `${Math.min(Math.max(activeHotspot.y + 5, 10), 70)}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeHotspot.title}
              </h4>
              <button
                onClick={closePopup}
                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeHotspot.content}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Card Reveal variant ─────────────────────────────────────────────────────

function CardRevealVariant({
  data,
  hasCompleted,
  onAllRevealed,
}: {
  data: HotspotData
  hasCompleted: boolean
  onAllRevealed: () => void
}) {
  const cards = data.cards ?? []
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  function handleCardClick(cardId: string) {
    setRevealedIds(prev => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
        return next
      }
      next.add(cardId)
      if (next.size === cards.length && !hasCompleted) {
        setTimeout(() => onAllRevealed(), 0)
      }
      return next
    })
  }

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {revealedIds.size} of {cards.length} revealed
        </p>
        <div className="flex gap-1">
          {cards.map(c => (
            <div
              key={c.id}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                revealedIds.has(c.id)
                  ? 'bg-primary-500'
                  : 'bg-calm-200 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(card => {
          const isRevealed = revealedIds.has(card.id)
          const accentColor = card.color || '#6366f1'
          return (
            <div
              key={card.id}
              className="perspective-[800px]"
              style={{ perspective: '800px' }}
            >
              <button
                onClick={() => handleCardClick(card.id)}
                className="w-full relative touch-manipulation"
                style={{
                  transformStyle: 'preserve-3d',
                  minHeight: '140px',
                }}
                aria-label={isRevealed ? `${card.frontLabel}: ${card.backContent}` : `Reveal ${card.frontLabel}`}
              >
                <div
                  className="w-full h-full motion-safe:transition-transform motion-safe:duration-500"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Front face */}
                  <div
                    className="absolute inset-0 rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 backface-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      borderColor: accentColor,
                      backgroundColor: `${accentColor}10`,
                    }}
                  >
                    {card.frontIcon && (
                      <span className="text-2xl" role="img" aria-hidden="true">
                        {card.frontIcon}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                      {card.frontLabel}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Tap to reveal
                    </span>
                  </div>

                  {/* Back face */}
                  <div
                    className="absolute inset-0 rounded-xl border-2 p-4 flex items-center justify-center backface-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      borderColor: accentColor,
                      backgroundColor: `${accentColor}15`,
                    }}
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-200 text-center leading-relaxed">
                      {card.backContent}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function HotspotActivity({ title, instructions, data, completed, onComplete }: HotspotActivityProps) {
  const [hasCompleted, setHasCompleted] = useState(completed)

  const handleAllRevealed = useCallback(() => {
    if (!hasCompleted) {
      setHasCompleted(true)
      onComplete()
    }
  }, [hasCompleted, onComplete])

  // buildHotspotReadAloudText is shared with the server-side prewarm so both
  // sides produce identical sha256 keys against the Blob TTS cache. The text
  // is passed to BlockInstructions, which renders a single TTS player at the
  // top of the block that reads title + instructions + content as one track.
  const readAloudText = data.readAloud ? buildHotspotReadAloudText(data) : ''

  return (
    <div className="my-6">
      <BlockInstructions
        title={title}
        instructions={instructions}
        readAloudText={readAloudText}
      />

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 p-5">
        {data.variant === 'image-hotspot' && (
          <ImageHotspotVariant
            data={data}
            hasCompleted={hasCompleted}
            onAllRevealed={handleAllRevealed}
          />
        )}
        {data.variant === 'card-reveal' && (
          <CardRevealVariant
            data={data}
            hasCompleted={hasCompleted}
            onAllRevealed={handleAllRevealed}
          />
        )}
      </div>

      <BlockCompletionBadge completed={hasCompleted} />
    </div>
  )
}
