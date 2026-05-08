import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { generateText, experimental_generateImage as generateImage } from 'ai'
import { put } from '@vercel/blob'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { runPrompt, AI_FEATURE_UNAVAILABLE } from '@/lib/ai-runner'
import { getActiveBrandAssets, assembleBrandTextContext } from '@/lib/brand-assets'

// Collection-level companion to /api/super-admin/library/generate (which is
// per-document). Generates a title + 2-3 sentence description by feeding the
// model the list of document filenames already in the collection (the
// strongest signal for "what is this collection about?"). The thumbnail is
// then generated FROM THE DESCRIPTION so the artwork matches the framing
// the AI just chose, not the filenames.

const requestSchema = z.object({
  // For an existing collection: pass the id and we'll fetch its filenames.
  collectionId: z.string().optional(),
  // Or pass filenames directly (e.g. from the new-collection create form
  // where the docs aren't yet attached). Capped to keep the prompt small.
  sampleFilenames: z.array(z.string()).max(50).optional(),
  // Optional admin-supplied topic ("autistic young people in the workplace")
  // — overrides/augments the filename signal when supplied.
  topicSeed: z.string().max(500).optional(),
  // Optional current metadata. Useful when the admin is asking the AI to
  // *improve* what's already there rather than start from scratch.
  currentTitle: z.string().max(200).optional(),
  currentDescription: z.string().max(2000).optional(),
  generateImage: z.boolean().default(false),
  // When true, fetch the active Brand Store and inject:
  //   - text-y assets (guidelines + messaging titles/descriptions) into
  //     the title/description prompt
  //   - the synthesised brand context into the image prompt so generated
  //     thumbnails align with the charity's look
  useBrandStore: z.boolean().default(false),
})

const IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview'
const IMAGEN_FALLBACK = 'google/imagen-4.0-generate-001'

type Generated = {
  title: string
  description: string
  thumbnailUrl: string | null
  imageError?: string
  source: 'ai' | 'fallback'
}

export async function POST(req: NextRequest): Promise<NextResponse<Generated | { error: string }>> {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  let { sampleFilenames } = parsed.data
  const { collectionId, topicSeed, currentTitle, currentDescription, generateImage: doGenerateImage, useBrandStore } = parsed.data

  // Optional brand-store context. Loaded once and reused for both the
  // title/description prompt and the image prompt below.
  const brandContext = useBrandStore
    ? assembleBrandTextContext(await getActiveBrandAssets(prisma))
    : ''

  // Fetch filenames from the collection if the caller didn't pass them.
  if (collectionId && (!sampleFilenames || sampleFilenames.length === 0)) {
    const docs = await prisma.libraryDocument.findMany({
      where: { collectionId, active: true },
      select: { fileName: true, title: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      take: 50,
    })
    // Prefer the doc title (which itself is often AI-derived from filename),
    // fall back to the raw filename. Either way we feed the model a list.
    sampleFilenames = docs.map((d) => d.title || d.fileName)
  }

  const fileNamesInput = (sampleFilenames ?? []).filter((s) => s && s.trim().length > 0)
  const fileNamesBlock = fileNamesInput.length > 0
    ? fileNamesInput.map((n, i) => `${i + 1}. ${n}`).join('\n')
    : '(none — base your answer on the topic seed only)'

  const seed = topicSeed?.trim() ?? ''
  if (fileNamesInput.length === 0 && !seed) {
    return NextResponse.json(
      { error: 'Add at least one document to the collection or supply a topic seed first.' },
      { status: 400 },
    )
  }

  // Title fallback. Used if the AI prompt is missing/disabled or if the
  // model returns garbage — keeps the feature usable without runtime errors.
  let title = currentTitle?.trim() || (seed ? toTitleCase(seed.slice(0, 60)) : 'Untitled collection')
  let description = currentDescription?.trim() || ''
  let source: 'ai' | 'fallback' = 'fallback'

  try {
    const text = await runPrompt('library.collection.metadata', {
      fileNames: fileNamesBlock,
      topicSeed: seed,
      currentTitle: currentTitle ?? '',
      currentDescription: currentDescription ?? '',
      brandContext,
    })
    if (text !== AI_FEATURE_UNAVAILABLE) {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const meta = JSON.parse(jsonMatch[0]) as { title?: string; description?: string }
        if (meta.title && meta.title.trim().length > 0) title = meta.title.trim()
        if (meta.description && meta.description.trim().length > 0) {
          description = meta.description.trim()
        }
        source = 'ai'
      }
    }
  } catch {
    // Defensive — runPrompt or JSON.parse failed. Fall through with
    // whatever defaults are already populated above.
  }

  // Generate the thumbnail from the (newly AI-generated) description as
  // the user explicitly requested. Falls back to the title if no
  // description ever materialised.
  let thumbnailUrl: string | null = null
  let imageError: string | undefined

  if (doGenerateImage) {
    const subject = (description || title).slice(0, 600)
    const brandPreamble = brandContext ? `\n\nBrand context to align with:\n${brandContext}\n` : ''
    const imagePrompt = `Create a simple, friendly, colourful illustration that represents the following Library collection:\n\n${subject}${brandPreamble}\n\nUse a clean, modern flat illustration style with bright welcoming colours. No text in the image. Professional but approachable. Suitable as a tile cover for a young-person-friendly resource library.`

    try {
      const result = await generateText({ model: IMAGE_MODEL, prompt: imagePrompt, maxRetries: 2 })
      const imageFiles = (result.files ?? []).filter((f) => f.mediaType?.startsWith('image/'))

      if (imageFiles.length > 0) {
        const imgFile = imageFiles[0]
        const mimeType = imgFile.mediaType ?? 'image/png'
        const ext = mimeType.includes('png') ? 'png' : 'jpg'
        const imageBuffer = Buffer.from(imgFile.base64 ?? '', 'base64')
        const blob = await put(
          `library/thumbnails/ai-collection-${Date.now()}.${ext}`,
          imageBuffer,
          { access: 'public', addRandomSuffix: true, contentType: mimeType },
        )
        thumbnailUrl = blob.url
      } else {
        imageError = 'Gemini image model returned no image parts'
      }
    } catch (imgErr) {
      const errMsg = imgErr instanceof Error ? imgErr.message : String(imgErr)
      imageError = `Gemini image: ${errMsg}`

      // Fallback to Imagen 4 — same chain as the per-document route.
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
            `library/thumbnails/ai-collection-${Date.now()}.${ext}`,
            imageBuffer,
            { access: 'public', addRandomSuffix: true, contentType: mimeType },
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

  return NextResponse.json({ title, description, thumbnailUrl, imageError, source })
}

function toTitleCase(input: string): string {
  return input.replace(/\b([a-z])/g, (m) => m.toUpperCase())
}
