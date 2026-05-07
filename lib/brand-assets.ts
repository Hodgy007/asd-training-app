// Helper for piping the charity Brand Store into AI generators.
//
// Two integration points:
//   1. Text prompts — assembleBrandTextContext() returns a short paragraph
//      summarising what's in the brand store so the model knows the
//      palette / tone / messaging it should align to.
//   2. Image prompts — collectBrandImageRefs() returns URLs of LOGO /
//      IMAGERY / COLOUR_PALETTE assets that callers can pass as visual
//      style references to image-generation models.
//
// Callers gate this behind a useBrandStore boolean on the API, so a
// generation can opt in/out per request.

import type { PrismaClient } from '@prisma/client'

type BrandAssetLite = {
  id: string
  type: string
  title: string
  description: string | null
  fileUrl: string
  fileType: string
}

const TEXT_TYPES = new Set(['BRAND_GUIDELINES', 'MESSAGING'])
const IMAGE_TYPES = new Set(['LOGO', 'IMAGERY', 'COLOUR_PALETTE'])

export async function getActiveBrandAssets(prisma: PrismaClient): Promise<BrandAssetLite[]> {
  return prisma.brandAsset.findMany({
    where: { active: true },
    orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      type: true,
      title: true,
      description: true,
      fileUrl: true,
      fileType: true,
    },
  })
}

/**
 * Build a plain-text paragraph the AI can read alongside whatever else
 * we're sending. We deliberately keep this short — context-window cost
 * matters and the brand store can grow large. Title + 1-line description
 * per asset, grouped by type. Image assets contribute their title +
 * description but not their file content (image grounding is done
 * separately via collectBrandImageRefs).
 */
export function assembleBrandTextContext(assets: BrandAssetLite[]): string {
  if (assets.length === 0) return ''

  const byType = new Map<string, BrandAssetLite[]>()
  for (const a of assets) {
    const bucket = byType.get(a.type) ?? []
    bucket.push(a)
    byType.set(a.type, bucket)
  }

  const lines: string[] = []
  lines.push('## Brand assets to align with')
  lines.push('The Ambitious about Autism brand store contains the following assets. Treat them as the canonical brand voice/look. Match palette, tone, and visual style where applicable.')
  lines.push('')

  const order = ['LOGO', 'COLOUR_PALETTE', 'BRAND_GUIDELINES', 'MESSAGING', 'IMAGERY', 'OTHER']
  for (const type of order) {
    const items = byType.get(type)
    if (!items || items.length === 0) continue
    lines.push(`**${humaniseType(type)}**`)
    for (const a of items) {
      const desc = a.description ? ` — ${a.description}` : ''
      lines.push(`- ${a.title}${desc}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

/**
 * Image-only URLs from the active brand store — used as style references
 * when an image-generation model supports image conditioning.
 */
export function collectBrandImageRefs(assets: BrandAssetLite[]): string[] {
  return assets
    .filter((a) => a.fileType.startsWith('image/') && IMAGE_TYPES.has(a.type))
    .map((a) => a.fileUrl)
}

function humaniseType(type: string): string {
  switch (type) {
    case 'LOGO': return 'Logos'
    case 'BRAND_GUIDELINES': return 'Brand guidelines'
    case 'IMAGERY': return 'Sample imagery'
    case 'COLOUR_PALETTE': return 'Colour palette'
    case 'MESSAGING': return 'Messaging / tone of voice'
    case 'OTHER': return 'Other brand assets'
    default: return type
  }
}

// Re-export for tests / call sites
export { TEXT_TYPES as BRAND_TEXT_TYPES, IMAGE_TYPES as BRAND_IMAGE_TYPES }
