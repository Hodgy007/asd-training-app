import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'

interface SnapshotFields {
  tone?: string
  requirements?: string[]
  exampleOutput?: string | null
  model?: string
  enabled?: boolean
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await prisma.aiPrompt.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!existing.previousFields) {
    return NextResponse.json({ error: 'Nothing to undo' }, { status: 400 })
  }

  const prev = existing.previousFields as unknown as SnapshotFields
  if (
    typeof prev.tone !== 'string' ||
    !Array.isArray(prev.requirements) ||
    typeof prev.model !== 'string' ||
    typeof prev.enabled !== 'boolean'
  ) {
    return NextResponse.json({ error: 'Undo snapshot is malformed' }, { status: 500 })
  }

  const updated = await prisma.aiPrompt.update({
    where: { id: params.id },
    data: {
      tone: prev.tone,
      requirements: prev.requirements,
      exampleOutput: prev.exampleOutput ?? null,
      model: prev.model,
      enabled: prev.enabled,
      previousFields: undefined,
      updatedBy: session.user.id,
    },
  })

  return NextResponse.json(updated)
}
