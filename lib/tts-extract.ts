import { InteractiveBlock, HotspotData, CarouselData, CarouselSlide } from '@/types/interactive'
import { htmlToPlainText } from '@/lib/html-to-text'
import { splitContentAtBlocks } from '@/lib/interactive-blocks'

// Single source of truth for every plain-text string the TTS system needs to
// narrate. Both the client-side readers (TtsAudioPlayer) and the server-side
// prewarm use this, so the sha256(text) hash is guaranteed to line up — the
// Blob cache only works if both sides compute the exact same key.

export function buildHotspotReadAloudText(data: HotspotData): string {
  if (data.variant === 'image-hotspot') {
    return (data.hotspots ?? [])
      .map((h) => [h.title, h.content].filter(Boolean).join('. '))
      .filter(Boolean)
      .join('. ')
  }
  return (data.cards ?? [])
    .map((c) => [c.frontLabel, c.backContent].filter(Boolean).join('. '))
    .filter(Boolean)
    .join('. ')
}

/**
 * @deprecated Carousels now render a TTS player per slide rather than one
 * combined player. Kept for any callers that want the full carousel text.
 */
export function buildCarouselReadAloudText(data: CarouselData): string {
  return (data.slides ?? [])
    .map(buildCarouselSlideTtsText)
    .filter(Boolean)
    .join('. ')
}

/**
 * Plain-text for one carousel slide — what the in-carousel player reads when
 * that slide is on screen. Shared between the client (carousel-activity) and
 * server-side prewarm so sha256(text) cache keys line up.
 */
export function buildCarouselSlideTtsText(slide: CarouselSlide): string {
  return [slide.title, htmlToPlainText(slide.body)]
    .filter((s) => Boolean(s?.trim()))
    .join('. ')
}

/**
 * Build the exact plain-text string the `BlockInstructions` component hands to
 * its top-of-block TTS player for a given interactive block. Must stay in sync
 * with `BlockInstructions` — the sha256 of this string is the Blob cache key,
 * so any drift between client and prewarm produces silent cache misses.
 *
 * Carousels intentionally don't append slide content here: each slide has its
 * own player inside the carousel frame that reads only the visible slide.
 */
export function buildBlockTtsText(block: InteractiveBlock): string {
  let readAloud = ''
  if (block.type === 'hotspot') {
    const data = block.data as HotspotData
    if (data.readAloud) readAloud = buildHotspotReadAloudText(data)
  }
  return [block.title, block.instructions, readAloud]
    .filter((s) => Boolean(s?.trim()))
    .join('. ')
}

/**
 * The exact text the bottom "Read the lesson text aloud" player sends — just
 * the prose segments between interactive blocks, joined as one narration.
 * Block content is deliberately excluded so this player doesn't duplicate
 * what the per-block players already cover at the top of each block.
 */
export function extractLessonProseTtsText(
  content: string,
  blocks: InteractiveBlock[]
): string {
  const segments = splitContentAtBlocks(content || '', blocks || [])
  return segments
    .filter((s) => s.type === 'html')
    .map((s) => htmlToPlainText(s.content))
    .filter((t) => Boolean(t?.trim()))
    .join('. ')
}

/**
 * Produce every plain-text string the lesson page will hand to a TTS player,
 * in render order:
 *   1. Joined prose (the bottom "Read lesson text aloud" player)
 *   2. One per interactive block (its top-of-block player)
 *   3. One per carousel slide (the in-carousel per-slide player)
 * Duplicates are stripped so we never pay ElevenLabs twice for the same text.
 */
export function extractLessonTtsTexts(
  content: string,
  blocks: InteractiveBlock[]
): string[] {
  const texts: string[] = []

  const prose = extractLessonProseTtsText(content, blocks)
  if (prose) texts.push(prose)

  const segments = splitContentAtBlocks(content || '', blocks || [])
  const blocksById = new Map((blocks || []).map((b) => [b.id, b]))

  for (const segment of segments) {
    if (segment.type !== 'block') continue
    const block = blocksById.get(segment.blockId)
    if (!block) continue
    const blockText = buildBlockTtsText(block)
    if (blockText) texts.push(blockText)
    if (block.type === 'carousel') {
      const data = block.data as CarouselData
      for (const slide of data.slides ?? []) {
        const slideText = buildCarouselSlideTtsText(slide)
        if (slideText) texts.push(slideText)
      }
    }
  }

  // Dedup while preserving order.
  const seen = new Set<string>()
  return texts.filter((t) => {
    if (seen.has(t)) return false
    seen.add(t)
    return true
  })
}
