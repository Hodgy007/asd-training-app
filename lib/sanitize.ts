import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'blockquote', 'pre', 'code',
  'span', 'div',
  'video', 'source', 'iframe',
]

const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'width', 'height',
  'class', 'style',
  'colspan', 'rowspan',
  'data-interactive-block',
  'controls', 'preload', 'poster', 'loop', 'muted', 'playsinline', 'type',
  'allowfullscreen', 'frameborder', 'allow',
]

export function sanitizeHtml(dirty: string): string {
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
  // Rich-text editors (and paste-from-Word) often insert non-breaking spaces
  // between every word, which prevents normal word-wrap in narrow containers
  // (e.g. list items on module cards). Normalise them to regular spaces.
  return clean.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ')
}
