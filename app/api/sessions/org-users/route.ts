import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canCreateSessions } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !canCreateSessions(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  const where: Record<string, unknown> = {
    organisationId: orgId,
    active: true,
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
    take: 50,
  })

  return NextResponse.json(users)
}
