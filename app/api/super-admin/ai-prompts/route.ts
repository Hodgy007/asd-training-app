import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const prompts = await prisma.aiPrompt.findMany({
    select: {
      id: true,
      key: true,
      name: true,
      purpose: true,
      category: true,
      model: true,
      enabled: true,
      updatedAt: true,
      updatedByUser: { select: { name: true, email: true } },
      _count: { select: { contextFiles: true } },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(prompts)
}
