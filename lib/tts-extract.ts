import { InteractiveBlock, HotspotData, CarouselData } from '@/types/interactive'
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

export function buildCarouselReadAloudText(data: CarouselData): string {
  return (data.slides ?? [])
    .map((s) => [s.title, htmlToPlainText(s.body)].filter(Boolean).join('. '))
    .filter(Boolean)
    .join('. ')
}

/**
 * Build the exact plain-text string the `BlockInstructions` component hands to
 * its top-of-block TTS player for a given interactive block. Must stay in sync
 * with `BlockInstructions` — the sha256 of this string is the Blob cache key,
 * so any drift between client and prewarm produces silent cache misses.
 */
export function buildBlockTtsText(block: InteractiveBlock): string {
  let readAloud = ''
  if (block.type === 'hotspot') {
    const data = block.data as HotspotData
    if (data.readAloud) readAloud = buildHotspotReadAloudText(data)
  } else if (block.type === 'carousel') {
    const data = block.data as CarouselData
    if (data.readAloud) readAloud = buildCarouselReadAloudText(data)
  }
  return [block.title, block.instructions, readAloud]
    .filter((s) => Boolean(s?.trim()))
    .join('. ')
}

/**
 * Produce every plain-text string the lesson page will hand to the TTS player,
 * in render order. Duplicates are stripped so we never pay ElevenLabs twice
 * for the same text.
 */
export function extractLessonTtsTexts(
  content: string,
  blocks: InteractiveBlock[]
): string[] {
  const texts: string[] = []

  const segments = splitContentAtBlocks(content || '', blocks || [])
  const blocksById = new Map((blocks || []).map((b) => [b.id, b]))

  for (const segment of segments) {
    if (segment.type === 'html') {
      const plain = htmlToPlainText(segment.content)
      if (plain) texts.push(plain)
      continue
    }
    const block = blocksById.get(segment.blockId)
    if (!block) continue
    // One TTS string per block — title + instructions + (optional read-aloud
    // content). Every interactive block now renders a top-of-block audio
    // player, so every block contributes to the prewarm list.
    const t = buildBlockTtsText(block)
    if (t) texts.push(t)
  }

  // Dedup while preserving order.
  const seen = new Set<string>()
  return texts.filter((t) => {
    if (seen.has(t)) return false
    seen.add(t)
    return true
  })
}
