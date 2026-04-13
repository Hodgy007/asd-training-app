import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { generateText, experimental_generateImage as generateImage } from 'ai'
import { put } from '@vercel/blob'
import { z } from 'zod'

const requestSchema = z.object({
  fileName: z.string().min(1),
  collectionTitle: z.string().optional(),
  generateImage: z.boolean().default(false),
})

const TEXT_MODEL = 'google/gemini-2.5-flash'
const IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview'
const IMAGEN_FALLBACK = 'google/imagen-4.0-generate-001'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { fileName, collectionTitle, generateImage: doGenerateImage } = parsed.data

  // Generate title and description from filename
  const textPrompt = `You are helping create metadata for a document in a training library${collectionTitle ? ` under the collection "${collectionTitle}"` : ''}. The document's filename is: "${fileName}"

Generate a clear, friendly title and a short description (2-3 sentences) suitable for young people and training practitioners. The title should be human-readable (not the raw filename). The description should summarise what the document likely contains based on its name.

Return ONLY valid JSON in this exact format, no markdown:
{"title": "...", "description": "..."}`

  let title = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
  let description = ''

  try {
    const { text } = await generateText({ model: TEXT_MODEL, prompt: textPrompt, maxRetries: 3 })
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
    const imagePrompt = `Create a simple, friendly, colourful illustration for a training document titled "${title}". The image should be a clean, modern flat illustration style with bright welcoming colours. No text in the image. Professional but approachable.`

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
