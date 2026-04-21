const BLOCK_TAGS = /<\/?(p|div|section|article|header|footer|h[1-6]|li|ul|ol|br|tr|td|th|table|blockquote|pre)[^>]*>/gi

export function htmlToPlainText(html: string, maxLen = 7900): string {
  if (!html) return ''
  const withSpaces = html.replace(BLOCK_TAGS, ' ')
  const stripped = withSpaces.replace(/<[^>]+>/g, '')
  const decoded = stripped
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
  const collapsed = decoded.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= maxLen) return collapsed
  const truncated = collapsed.slice(0, maxLen)
  const lastStop = Math.max(truncated.lastIndexOf('. '), truncated.lastIndexOf('! '), truncated.lastIndexOf('? '))
  return lastStop > maxLen * 0.6 ? truncated.slice(0, lastStop + 1) : truncated
}
