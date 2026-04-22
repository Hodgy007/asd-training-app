import sanitize from 'sanitize-html'

// Pure-JS sanitizer. Replaces isomorphic-dompurify, which pulled in jsdom and
// blew up on Vercel Lambdas after @exodus/bytes went ESM-only
// (ERR_REQUIRE_ESM in html-encoding-sniffer).

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

// sanitize-html takes a per-tag attribute map. We keep every tag's attribute
// allow-list identical for simplicity — same behaviour we had with DOMPurify's
// flat ALLOWED_ATTR list.
const COMMON_ATTRS = [
  'href', 'target', 'rel',
  'src', 'alt', 'width', 'height',
  'class', 'style',
  'colspan', 'rowspan',
  'data-interactive-block',
  'controls', 'preload', 'poster', 'loop', 'muted', 'playsinline', 'type',
  'allowfullscreen', 'frameborder', 'allow',
]

const allowedAttributes: Record<string, string[]> = {}
for (const tag of ALLOWED_TAGS) allowedAttributes[tag] = COMMON_ATTRS
allowedAttributes['*'] = COMMON_ATTRS

export function sanitizeHtml(dirty: string): string {
  const clean = sanitize(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes,
    // Permit YouTube/Vimeo iframes and common media URL schemes
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'youtube-nocookie.com', 'player.vimeo.com', 'vimeo.com'],
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    // style is a free-form attribute — sanitize-html drops it by default unless
    // we declare which properties/values to allow. Match DOMPurify's behaviour
    // (style allowed through unchanged) with a permissive regex.
    allowedStyles: {
      '*': {
        '*': [/^.*$/],
      },
    },
  })
  // Rich-text editors (and paste-from-Word) often insert non-breaking spaces
  // between every word, which prevents normal word-wrap in narrow containers
  // (e.g. list items on module cards). Normalise them to regular spaces.
  return clean.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ')
}
