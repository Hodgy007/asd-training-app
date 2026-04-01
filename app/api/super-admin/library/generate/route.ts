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
const IMAGE_MODEL = 'imagen-3.0-generate-002'

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
    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed.title) title = parsed.title
      if (parsed.description) description = parsed.description
    }
  } catch {
    // Fall back to cleaned filename
    description = `Document from the ${collectionTitle || 'library'} collection.`
  }

  // Generate a young-person-friendly illustration if requested
  let thumbnailUrl: string | null = null
  if (generateImage) {
    try {
      const imagePrompt = `Create a simple, friendly, colourful illustration for a training document titled "${title}". The image should be:
- Suitable for young people (16-25 years old)
- Clean, modern flat illustration style
- Bright and welcoming colours
- No text in the image
- Related to the topic of the document
- Professional but approachable`

      const imageResult = await ai.models.generateImages({
        model: IMAGE_MODEL,
        prompt: imagePrompt,
        config: {
          numberOfImages: 1,
        },
      })

      const generated = imageResult.generatedImages?.[0]
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
      }
    } catch (imgErr) {
      console.error('AI image generation failed:', imgErr)
    }
  }

  return NextResponse.json({ title, description, thumbnailUrl })
}
