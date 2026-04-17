import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'

interface DefaultFields {
  tone: string
  requirements: string[]
  exampleOutput: string | null
  model: string
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

  const defaults = existing.defaultFields as unknown as DefaultFields
  if (
    typeof defaults.tone !== 'string' ||
    !Array.isArray(defaults.requirements) ||
    typeof defaults.model !== 'string'
  ) {
    return NextResponse.json({ error: 'Default fields are malformed' }, { status: 500 })
  }

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
      tone: defaults.tone,
      requirements: defaults.requirements,
      exampleOutput: defaults.exampleOutput,
      model: defaults.model,
      previousFields,
      updatedBy: session.user.id,
    },
  })

  return NextResponse.json(updated)
}
