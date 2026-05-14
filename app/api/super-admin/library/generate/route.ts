import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { createRateLimiter } from '@/lib/rate-limit'
import { generateText, experimental_generateImage as generateImage } from 'ai'
import { put } from '@vercel/blob'
import { z } from 'zod'
import { runPrompt } from '@/lib/ai-runner'

const requestSchema = z.object({
  fileName: z.string().min(1),
  collectionTitle: z.string().optional(),
  generateImage: z.boolean().default(false),
  // Optional caller-supplied description. When present, the image prompt is
  // built from this rather than the (filename-derived) title — descriptions
  // are richer input than filenames so the generated image is more relevant.
  description: z.string().optional(),
})

const IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview'
const IMAGEN_FALLBACK = 'google/imagen-4.0-generate-001'

// Belt-and-braces rate limiting on top of the MANAGE_LIBRARY role gate.
// Per-document metadata + optional thumbnail is the lighter of the library
// AI surfaces, but it can be triggered in a tight loop during a bulk import.
const libraryGenLimiter = createRateLimiter('library-gen', 5 * 60 * 1000, 20)
const libraryGenDailyLimiter = createRateLimiter('library-gen-daily', 24 * 60 * 60 * 1000, 50)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const daily = await libraryGenDailyLimiter.check(session.user.id)
  if (!daily.success) {
    return NextResponse.json(
      {
        error: 'You have reached today’s AI generation limit. Please try again tomorrow.',
        code: 'DAILY_LIMIT',
      },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(daily.retryAfterMs / 1000)) } },
    )
  }
  const rate = await libraryGenLimiter.check(session.user.id)
  if (!rate.success) {
    return NextResponse.json(
      { error: 'Too many generation requests. Please wait a few minutes before trying again.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) } },
    )
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { fileName, collectionTitle, generateImage: doGenerateImage, description: callerDescription } = parsed.data

  const collectionContext = collectionTitle ? `under the collection "${collectionTitle}"` : ''

  let title = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
  let description = ''

  try {
    const text = await runPrompt('library.metadata', { collectionContext, fileName })
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const meta = JSON.parse(jsonMatch[0])
      if (meta.title) title = meta.title
      if (meta.description) description = meta.description
    }
  } catch {
    description = `Document from the ${collectionTitle || 'library'} collection.`
  }

  // Generate a young-person-friendly illustration if requested
  let thumbnailUrl: string | null = null
  let imageError: string | undefined

  if (doGenerateImage) {
    // Prefer the caller's description (richer signal than a filename); fall
    // back to the AI-generated description, then the title.
    const subject = (callerDescription?.trim() || description || title).slice(0, 600)
    const imagePrompt = `Create a simple, friendly, colourful illustration that represents the following training resource:\n\n${subject}\n\nUse a clean, modern flat illustration style with bright welcoming colours. No text in the image. Professional but approachable.`

    // Try multimodal Gemini image generation
    try {
      const result = await generateText({ model: IMAGE_MODEL, prompt: imagePrompt, maxRetries: 2 })
      const imageFiles = (result.files ?? []).filter((f) => f.mediaType?.startsWith('image/'))

      if (imageFiles.length > 0) {
        const imgFile = imageFiles[0]
        const mimeType = imgFile.mediaType ?? 'image/png'
        const ext = mimeType.includes('png') ? 'png' : 'jpg'
        const imageBuffer = Buffer.from(imgFile.base64 ?? '', 'base64')
        const blob = await put(
          `library/thumbnails/ai-generated-${Date.now()}.${ext}`,
          imageBuffer,
          { access: 'public', addRandomSuffix: true, contentType: mimeType }
        )
        thumbnailUrl = blob.url
      } else {
        imageError = 'Gemini image model returned no image parts'
      }
    } catch (imgErr) {
      const errMsg = imgErr instanceof Error ? imgErr.message : String(imgErr)
      imageError = `Gemini image: ${errMsg}`

      // Fallback: Imagen 4
      try {
        const { images } = await generateImage({
          model: IMAGEN_FALLBACK,
          prompt: imagePrompt,
          n: 1,
        })

        const generated = images[0]
        if (generated?.base64) {
          const mimeType = generated.mediaType ?? 'image/png'
          const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png'
          const imageBuffer = Buffer.from(generated.base64, 'base64')
          const blob = await put(
            `library/thumbnails/ai-generated-${Date.now()}.${ext}`,
            imageBuffer,
            { access: 'public', addRandomSuffix: true, contentType: mimeType }
          )
          thumbnailUrl = blob.url
          imageError = undefined
        } else {
          imageError += ' | Imagen 4 returned no image data'
        }
      } catch (fallbackErr) {
        const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        imageError += ` | Imagen 4 fallback: ${fbMsg}`
      }
    }
  }

  return NextResponse.json({ title, description, thumbnailUrl, imageError })
}
