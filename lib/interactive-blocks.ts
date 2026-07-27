import { InteractiveBlock, interactiveBlockSchema, interactiveBlocksSchema } from '@/types/interactive'

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
 * Strict, all-or-nothing validation. Returns null if the input isn't an array
 * or if *any* block fails the schema.
 *
 * This is the write-path contract: a payload that doesn't round-trip cleanly
 * must be rejected, not silently trimmed, or a malformed block gets deleted
 * from the database without anyone being told. Use it wherever the result is
 * about to be persisted.
 */
export function validateInteractiveBlocks(
  data: unknown
): InteractiveBlock[] | null {
  if (!data || !Array.isArray(data)) return null
  const result = interactiveBlocksSchema.safeParse(data)
  return result.success ? result.data : null
}

/** What survived a lenient parse, and what didn't. */
export interface LenientParseResult {
  blocks: InteractiveBlock[]
  /** Indices in the input array that failed the schema, in order. */
  invalidIndices: number[]
}

/**
 * Lenient, per-block parsing for *read* paths — rendering a lesson, extracting
 * TTS text, building a SCORM export.
 *
 * One malformed block used to hide every block on the lesson, because the whole
 * array was parsed in a single pass. Here each block is parsed on its own so
 * the good ones still render, and the callers that can act on it are told which
 * ones were dropped rather than being left to guess.
 *
 * Never feed this straight back into a save — see validateInteractiveBlocks.
 */
export function parseInteractiveBlocksLenient(data: unknown): LenientParseResult {
  if (!data || !Array.isArray(data)) return { blocks: [], invalidIndices: [] }

  const blocks: InteractiveBlock[] = []
  const invalidIndices: number[] = []

  data.forEach((item, index) => {
    const result = interactiveBlockSchema.safeParse(item)
    if (result.success) blocks.push(result.data)
    else invalidIndices.push(index)
  })

  return { blocks, invalidIndices }
}

/**
 * Generate the HTML placeholder string for a block to insert into Quill content.
 * The title is shown as a visual indicator in the editor.
 */
export function generateBlockPlaceholder(blockId: string, _title: string): string {
  // Use a text-based marker that survives Quill's HTML processing.
  // Quill strips data attributes and may rewrite divs as paragraphs,
  // but preserves visible text content inside styled elements.
  //
  // No text-align here: Quill converts paragraph-level text-align into its
  // own `align` attribute, which the following paragraph then inherits — so
  // typing after the block would stay centered. Keep the pill left-aligned.
  return `<p style="background:#f0fdf4;border:2px dashed #86efac;border-radius:8px;padding:12px 16px;margin:8px 0;font-size:14px;color:#166534;">[INTERACTIVE:${blockId}]</p><p><br></p>`
}

/**
 * Strip `text-align` from any paragraph containing an interactive-block marker.
 * Older lessons were saved with `text-align:center` on the placeholder <p>,
 * which Quill converts to `ql-align-center` on load — and every paragraph the
 * user types after it inherits the alignment. Running this on load de-sticks
 * the alignment so new paragraphs render left-aligned.
 */
export function normaliseBlockPlaceholderAlignment(html: string): string {
  if (!html) return html
  // Match a whole <p>…</p> that contains [INTERACTIVE:…] anywhere inside
  // (including wrapping <span>s that Quill may add).
  return html.replace(
    /<p([^>]*)>((?:(?!<\/p>)[\s\S])*?\[INTERACTIVE:[^\]]+\](?:(?!<\/p>)[\s\S])*?)<\/p>/gi,
    (_match, attrs: string, inner: string) => {
      let cleaned = attrs
      // Strip any text-align from inline style.
      cleaned = cleaned.replace(/style\s*=\s*"([^"]*)"/gi, (_m, styles: string) => {
        const next = styles
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !/^text-align\s*:/i.test(s))
          .join('; ')
        return next ? `style="${next}"` : ''
      })
      // Strip ql-align-* classes (Quill-normalized form of text-align).
      cleaned = cleaned.replace(/class\s*=\s*"([^"]*)"/gi, (_m, classes: string) => {
        const next = classes
          .split(/\s+/)
          .filter(c => c && !/^ql-align-/.test(c))
          .join(' ')
        return next ? `class="${next}"` : ''
      })
      return `<p${cleaned.replace(/\s+/g, ' ').trimEnd()}>${inner}</p>`
    }
  )
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
