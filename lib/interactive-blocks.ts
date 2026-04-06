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
  // Match placeholder markers using two strategies:
  // 1. data-interactive-block attribute (if Quill preserved it)
  // 2. Fallback: marker comment pattern <!--IBLOCK:blockId--> that survives Quill
  // 3. Fallback: visible text marker pattern [INTERACTIVE:blockId] in any element
  const pattern = /(?:<[^>]*data-interactive-block="([^"]+)"[^>]*>[\s\S]*?<\/[^>]+>)|(?:<!--IBLOCK:([^-]+)-->)|(?:<[^>]*>\s*\[INTERACTIVE:([^\]]+)\]\s*<\/[^>]+>)/gi
  const segments: ContentSegment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(html)) !== null) {
    const blockId = match[1] || match[2] || match[3]
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
  return `<p style="background:#f0fdf4;border:2px dashed #86efac;border-radius:8px;padding:12px 16px;margin:8px 0;font-size:14px;color:#166534;text-align:center;">[INTERACTIVE:${blockId}]</p>`
}
