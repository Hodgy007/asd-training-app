import { InteractiveBlock, interactiveBlocksSchema } from '@/types/interactive'

// Content segment types for splitting lesson HTML at interactive block markers

export type ContentSegment =
  | { type: 'html'; content: string }
  | { type: 'block'; blockId: string }

/**
 * Split lesson HTML content at interactive block placeholder markers.
 * Placeholders are div elements with data-interactive-block attribute
 * injected by the admin builder.
 *
 * Returns an array of segments: HTML strings and block references, in order.
 * If no markers exist, returns a single HTML segment (backwards compatible).
 */
export function splitContentAtBlocks(
  html: string,
  blocks: InteractiveBlock[]
): ContentSegment[] {
  if (!blocks || blocks.length === 0) {
    return [{ type: 'html', content: html }]
  }

  const blockIds = new Set(blocks.map(b => b.id))
  // Match placeholder markers. Quill may wrap the marker text in various tags
  // (p, span with styles, etc.), so we match the raw [INTERACTIVE:blockId] text
  // along with the enclosing paragraph/element.
  // Pattern: match a single <p>…</p> that contains [INTERACTIVE:blockId].
  // The `(?:(?!<\/p>)[\s\S])*?` negative lookahead prevents the lazy quantifier
  // from crossing paragraph boundaries — without it, the regex would swallow
  // every earlier <p> up to the marker and wipe out the lesson text.
  const pattern = /<p[^>]*>(?:(?!<\/p>)[\s\S])*?\[INTERACTIVE:([^\]]+)\](?:(?!<\/p>)[\s\S])*?<\/p>/gi
  const segments: ContentSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html)) !== null) {
    const blockId = match[1]
    if (!blockId || !blockIds.has(blockId)) continue

    // Add the HTML before this marker
    if (match.index > lastIndex) {
      const htmlBefore = html.slice(lastIndex, match.index).trim()
      if (htmlBefore) {
        segments.push({ type: 'html', content: htmlBefore })
      }
    }

    segments.push({ type: 'block', blockId })
    lastIndex = match.index + match[0].length
  }

  // Add any remaining HTML after the last marker
  if (lastIndex < html.length) {
    const remaining = html.slice(lastIndex).trim()
    if (remaining) {
      segments.push({ type: 'html', content: remaining })
    }
  }

  // If no markers were found in the HTML, return everything as one segment
  if (segments.length === 0) {
    return [{ type: 'html', content: html }]
  }

  return segments
}

/**
 * Validate and parse interactive blocks from unknown JSON data (e.g. from DB).
 * Returns a typed array or null if invalid.
 */
export function validateInteractiveBlocks(
  data: unknown
): InteractiveBlock[] | null {
  if (!data || !Array.isArray(data)) return null
  const result = interactiveBlocksSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Generate the HTML placeholder string for a block to insert into Quill content.
 * The title is shown as a visual indicator in the editor.
 */
export function generateBlockPlaceholder(blockId: string, _title: string): string {
  // Use a text-based marker that survives Quill's HTML processing.
  // Quill strips data attributes and may rewrite divs as paragraphs,
  // but preserves visible text content inside styled elements.
  return `<p style="background:#f0fdf4;border:2px dashed #86efac;border-radius:8px;padding:12px 16px;margin:8px 0;font-size:14px;color:#166534;text-align:center;">[INTERACTIVE:${blockId}]</p><p><br></p>`
}

/**
 * Remove a block's placeholder paragraph from Quill HTML content.
 * Matches a single <p>…</p> containing [INTERACTIVE:blockId] and removes it.
 */
export function removeBlockPlaceholder(html: string, blockId: string): string {
  const escaped = blockId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(
    `<p[^>]*>(?:(?!<\\/p>)[\\s\\S])*?\\[INTERACTIVE:${escaped}\\](?:(?!<\\/p>)[\\s\\S])*?<\\/p>`,
    'gi'
  )
  return html.replace(pattern, '')
}
