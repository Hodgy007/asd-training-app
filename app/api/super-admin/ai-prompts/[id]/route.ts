import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { isValidModelId } from '@/lib/ai-models'
import { z } from 'zod'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const prompt = await prisma.aiPrompt.findUnique({
    where: { id: params.id },
    include: {
      contextFiles: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          parsedText: true,
          uploadedAt: true,
        },
        orderBy: { uploadedAt: 'asc' },
      },
      updatedByUser: { select: { name: true, email: true } },
    },
  })

  if (!prompt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(prompt)
}

const putSchema = z.object({
  tone: z.string(),
  requirements: z.array(z.string()),
  exampleOutput: z.string().nullable(),
  model: z.string().refine(isValidModelId, 'Model is not in the curated list'),
  enabled: z.boolean(),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const parsed = putSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const existing = await prisma.aiPrompt.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const previousFields = {
    tone: existing.tone,
    requirements: existing.requirements,
    exampleOutput: existing.exampleOutput,
    model: existing.model,
    enabled: existing.enabled,
  }

  const updated = await prisma.aiPrompt.update({
    where: { id: params.id },
    data: {
      tone: parsed.data.tone,
      requirements: parsed.data.requirements,
      exampleOutput: parsed.data.exampleOutput,
      model: parsed.data.model,
      enabled: parsed.data.enabled,
      previousFields,
      updatedBy: session.user.id,
    },
  })

  return NextResponse.json(updated)
}
