import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'
import { getCachedBannerUrl, storeBannerToBlob } from '@/lib/banner-blob'
import { generateBannerPng } from '@/lib/banner-generator'
import { createRateLimiter, getClientIp } from '@/lib/rate-limit'

const PROMPT_KEY = 'homepage.heroImage.generate'
const VALID_ASPECTS = new Set(['3:1', '4:1'])
type AspectRatio = '3:1' | '4:1'

// Imagen 4 only supports a fixed set of aspect ratios (1:1, 16:9, 9:16, 4:3,
// 3:4). Our editor talks in 3:1 (hero) and 4:1 (inline) for display, so we
// map both to 16:9 — the widest supported ratio. The display container then
// crops top/bottom via object-cover.
const GATEWAY_ASPECT: Record<AspectRatio, '16:9'> = {
  '3:1': '16:9',
  '4:1': '16:9',
}

// 10 generations per 5 minutes per IP — image generation is expensive.
const heroImageLimiter = createRateLimiter('hero-image-generate', 5 * 60 * 1000, 10)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Per-IP rate limit
  const ip = getClientIp(req)
  const rl = await heroImageLimiter.check(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before generating another banner.' },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => null)
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
  const aspectRatio = body?.aspectRatio as string | undefined

  if (!prompt || prompt.length > 500) {
    return NextResponse.json({ error: 'prompt must be 1–500 characters' }, { status: 400 })
  }
  if (!aspectRatio || !VALID_ASPECTS.has(aspectRatio)) {
    return NextResponse.json({ error: 'aspectRatio must be "3:1" or "4:1"' }, { status: 400 })
  }

  const promptRow = await prisma.aiPrompt.findUnique({ where: { key: PROMPT_KEY } })
  if (!promptRow || !promptRow.enabled) {
    return NextResponse.json({ error: 'gateway_unavailable' }, { status: 502 })
  }

  // Assemble the system preamble from the prompt row's requirements,
  // substituting the aspect ratio. We don't reuse ai-runner.runPrompt here
  // because it returns text — image gen has a different shape.
  const systemPreamble = (promptRow.requirements ?? [])
    .map((r) => r.replace(/\{\{aspectRatio\}\}/g, aspectRatio))
    .join('\n')
  const fullPrompt = `${systemPreamble}\n\nUser intent: ${prompt}`

  const cached = await getCachedBannerUrl(systemPreamble, prompt, promptRow.model, aspectRatio)
  if (cached) {
    return NextResponse.json({ url: cached, cached: true })
  }

  try {
    // Map our display aspect (3:1 / 4:1) to a gateway-supported aspect (16:9).
    const gatewayAspect = GATEWAY_ASPECT[aspectRatio as AspectRatio]
    const png = await generateBannerPng(fullPrompt, promptRow.model, gatewayAspect)
    const url = await storeBannerToBlob(systemPreamble, prompt, promptRow.model, aspectRatio, png)
    return NextResponse.json({ url, cached: false })
  } catch (err) {
    console.error('[hero-image/generate] failed:', err)
    return NextResponse.json({ error: 'gateway_unavailable' }, { status: 502 })
  }
}
