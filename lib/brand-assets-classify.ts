/**
 * Folder/filename → BrandAsset section classifier for the bulk-import zip
 * flow. Pure function, no DB / Blob coupling — kept here so the import
 * route can stay focused on IO and the rules are unit-testable.
 */

export type BrandAssetType =
  | 'LOGO'
  | 'BRAND_GUIDELINES'
  | 'IMAGERY'
  | 'COLOUR_PALETTE'
  | 'MESSAGING'
  | 'OTHER'

// Order matters when patterns could overlap — most specific patterns
// first. "brand guidelines" must match before "logos" because some kits
// stash a single PDF named "brand-guidelines-with-logos.pdf".
const RULES: Array<{ type: BrandAssetType; pattern: RegExp }> = [
  { type: 'BRAND_GUIDELINES', pattern: /(brand[\s_-]*guideline|brand[\s_-]*book|brandbook|style[\s_-]*guide|style[\s_-]*manual)/ },
  { type: 'COLOUR_PALETTE', pattern: /(colou?r[\s_-]*palette|\bpalette\b|swatch|colou?rways?)/ },
  { type: 'MESSAGING', pattern: /(messaging|tone[\s_-]*of[\s_-]*voice|\btov\b|\bvoice\b|copy[\s_-]*deck|key[\s_-]*messages?|boilerplate)/ },
  { type: 'LOGO', pattern: /(\blogos?\b|logomark|wordmark|monogram|\bicon[s]?\b)/ },
  { type: 'IMAGERY', pattern: /(\bimagery\b|\bphotos?\b|photography|\bimages?\b|\bpictures?\b|stock[\s_-]*image)/ },
]

/**
 * Classify a zip entry by its full path (folder segments + filename).
 * Folder segments are the strongest signal — a `Logos/primary.png`
 * matches even though "primary" alone wouldn't.
 *
 * Returns `fallback` (the user-chosen default) when no rule matches.
 */
export function classifyAssetPath(fullPath: string, fallback: BrandAssetType): BrandAssetType {
  const haystack = fullPath.toLowerCase().replace(/[\\/]/g, ' ')
  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) return rule.type
  }
  return fallback
}
