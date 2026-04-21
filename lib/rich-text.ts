const EMPTY_HTML_MARKERS = new Set(['', '<p><br></p>', '<p></p>', '<br>', '<p><br/></p>'])

export function normaliseHtml(html: string): string {
  const trimmed = html.trim()
  if (EMPTY_HTML_MARKERS.has(trimmed)) return ''
  return trimmed
}

export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isHtml(value: string | null | undefined): boolean {
  if (!value) return false
  return /<\/?[a-z][\s\S]*>/i.test(value)
}
