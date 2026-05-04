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
//
// Notes on what's intentionally NOT allowed:
//   - `class`: dropped. Trusted lesson content uses inline `style`; allowing
//     `class` lets a future writer leak Tailwind-driven layout breakouts
//     (e.g. fixed-positioned overlays for credential phishing).
//   - `id`: not needed for training content, would let authors target
//     external CSS or anchor-jack the page.
//   - `style` is allowed (rich-text editors emit it for color/alignment),
//     but only with a tightly bound list of properties+values — see
//     ALLOWED_STYLES below.
const COMMON_ATTRS = [
  'href', 'target', 'rel',
  'src', 'alt', 'width', 'height',
  'style',
  'colspan', 'rowspan',
  'data-interactive-block',
  'controls', 'preload', 'poster', 'loop', 'muted', 'playsinline', 'type',
  'allowfullscreen', 'frameborder', 'allow',
]

const allowedAttributes: Record<string, string[]> = {}
for (const tag of ALLOWED_TAGS) allowedAttributes[tag] = COMMON_ATTRS
allowedAttributes['*'] = COMMON_ATTRS

// CSS allowlist. Each property maps to the regexes its value must match.
// The previous wildcard (`'*': [/^.*$/]`) accepted ANY value for ANY
// property — including `position:fixed; top:0; left:0; width:100vw;
// height:100vh;` which lets a writer overlay the entire page with a fake
// login form on the trusted app domain. Tightening to a positive list of
// formatting-only properties closes that.
//
// Allowed value shapes:
//   colour   — #abc, #aabbcc, rgb(0,0,0), rgba(...), hsl/hsla, named colours
//   length   — 1.5em / 14px / 100% / auto / 0
//   keyword  — short alphanumerics for align/weight/style enums
const COLOUR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-zA-Z]+)$/
const LENGTH_RE = /^(auto|0|-?\d+(\.\d+)?(px|em|rem|%|vh|vw|pt)?)$/
const KEYWORD_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,40}$/
const LIST_RE = /^[a-zA-Z0-9 ,#'"().%-]{1,200}$/  // for compound values like font-family, text-shadow

const SAFE_STYLES: sanitize.IOptions['allowedStyles'] = {
  '*': {
    color: [COLOUR_RE],
    'background-color': [COLOUR_RE],
    'text-align': [/^(left|right|center|justify|start|end)$/],
    'text-decoration': [/^(none|underline|line-through|overline)$/],
    'font-weight': [/^(normal|bold|bolder|lighter|[1-9]00)$/],
    'font-style': [/^(normal|italic|oblique)$/],
    'font-size': [LENGTH_RE],
    'font-family': [LIST_RE],
    'line-height': [LENGTH_RE, /^\d+(\.\d+)?$/],
    'letter-spacing': [LENGTH_RE],
    margin: [LENGTH_RE, LIST_RE],
    'margin-top': [LENGTH_RE],
    'margin-right': [LENGTH_RE],
    'margin-bottom': [LENGTH_RE],
    'margin-left': [LENGTH_RE],
    padding: [LENGTH_RE, LIST_RE],
    'padding-top': [LENGTH_RE],
    'padding-right': [LENGTH_RE],
    'padding-bottom': [LENGTH_RE],
    'padding-left': [LENGTH_RE],
    width: [LENGTH_RE],
    height: [LENGTH_RE],
    'max-width': [LENGTH_RE],
    'max-height': [LENGTH_RE],
    border: [LIST_RE],
    'border-color': [COLOUR_RE],
    'border-width': [LENGTH_RE],
    'border-style': [KEYWORD_RE],
    'border-radius': [LENGTH_RE],
    // Deliberately omitted: position, top/left/right/bottom, z-index,
    // transform, opacity (overlay/clickjacking), display: fixed/sticky.
  },
}

export function sanitizeHtml(dirty: string): string {
  const clean = sanitize(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes,
    // Permit YouTube/Vimeo iframes and common media URL schemes
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'youtube-nocookie.com', 'player.vimeo.com', 'vimeo.com'],
    // `data:` URIs in <a href> were a top-of-page navigation vector
    // (`data:text/html,<script>...`). Modern browsers mostly block top-frame
    // data: navigation but it's still dirty — drop it for links entirely.
    // Images keep `data:` because inline thumbnails are common.
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowedStyles: SAFE_STYLES,
  })
  // Rich-text editors (and paste-from-Word) often insert non-breaking spaces
  // between every word, which prevents normal word-wrap in narrow containers
  // (e.g. list items on module cards). Normalise them to regular spaces.
  return clean.replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ')
}
