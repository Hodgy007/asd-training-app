import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { GoogleGenAI } from '@google/genai'
import { put } from '@vercel/blob'
import { z } from 'zod'

const requestSchema = z.object({
  fileName: z.string().min(1),
  collectionTitle: z.string().optional(),
  generateImage: z.boolean().default(false),
})

const TEXT_MODEL = 'gemini-2.5-flash'
const IMAGE_MODEL = 'gemini-2.5-flash-image'
const IMAGEN_FALLBACK = 'imagen-4.0-fast-generate-001'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  const body = await req.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { fileName, collectionTitle, generateImage } = parsed.data
  const ai = new GoogleGenAI({ apiKey })

  // Generate title and description from filename
  const textPrompt = `You are helping create metadata for a document in a training library${collectionTitle ? ` under the collection "${collectionTitle}"` : ''}. The document's filename is: "${fileName}"

Generate a clear, friendly title and a short description (2-3 sentences) suitable for young people and training practitioners. The title should be human-readable (not the raw filename). The description should summarise what the document likely contains based on its name.

Return ONLY valid JSON in this exact format, no markdown:
{"title": "...", "description": "..."}`

  let title = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
  let description = ''

  try {
    const textResult = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: textPrompt,
    })
    const text = textResult.text?.trim() ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.title) title = parsed.title
      if (parsed.description) description = parsed.description
    }
  } catch {
    description = `Document from the ${collectionTitle || 'library'} collection.`
  }

  // Generate a young-person-friendly illustration if requested
  let thumbnailUrl: string | null = null
  let imageError: string | undefined
  if (generateImage) {
    const imagePrompt = `Create a simple, friendly, colourful illustration for a training document titled "${title}". The image should be a clean, modern flat illustration style with bright welcoming colours. No text in the image. Professional but approachable.`

    // Try Gemini 2.5 Flash Image (multimodal with image output)
    try {
      const imageResult = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: imagePrompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      })

      const parts = imageResult.candidates?.[0]?.content?.parts ?? []
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith('image/')) {
          const imageBuffer = Buffer.from(part.inlineData.data!, 'base64')
          const mimeType = part.inlineData.mimeType
          const ext = mimeType === 'image/png' ? 'png' : 'jpg'
          const blob = await put(
            `library/thumbnails/ai-generated-${Date.now()}.${ext}`,
            imageBuffer,
            { access: 'public', addRandomSuffix: true, contentType: mimeType }
          )
          thumbnailUrl = blob.url
          break
        }
      }
      if (!thumbnailUrl) {
        imageError = 'Gemini 2.5 Flash Image returned no image parts'
      }
    } catch (imgErr: unknown) {
      const errMsg = imgErr instanceof Error ? imgErr.message : String(imgErr)
      imageError = `Gemini 2.5 Flash Image: ${errMsg}`

      // Fallback: try Imagen 4.0 Fast
      try {
        const fallbackResult = await ai.models.generateImages({
          model: IMAGEN_FALLBACK,
          prompt: imagePrompt,
          config: {
            numberOfImages: 1,
          },
        })

        const generated = fallbackResult.generatedImages?.[0]
        if (generated?.raiFilteredReason) {
          imageError += ` | Imagen 4: safety filter: ${generated.raiFilteredReason}`
        }
        if (generated?.image?.imageBytes) {
          const imageBuffer = Buffer.from(generated.image.imageBytes, 'base64')
          const mimeType = generated.image.mimeType || 'image/png'
          const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png'
          const blob = await put(
            `library/thumbnails/ai-generated-${Date.now()}.${ext}`,
            imageBuffer,
            { access: 'public', addRandomSuffix: true, contentType: mimeType }
          )
          thumbnailUrl = blob.url
          imageError = undefined
        } else if (!thumbnailUrl) {
          imageError += ' | Imagen 4 returned no image data'
        }
      } catch (fallbackErr: unknown) {
        const fbMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
        imageError += ` | Imagen 4 fallback: ${fbMsg}`
      }
    }
  }

  return NextResponse.json({ title, description, thumbnailUrl, imageError })
}
