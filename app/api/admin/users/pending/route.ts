import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const users = await prisma.user.findMany({
    where: { organisationId: orgId, pendingApproval: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return NextResponse.json({ users, count: users.length })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = z.object({
    userId: z.string().cuid(),
    action: z.enum(['approve', 'reject']),
  }).safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { userId, action } = parsed.data
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user || user.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!user.pendingApproval) {
    return NextResponse.json({ error: 'User is not pending approval' }, { status: 400 })
  }

  if (action === 'approve') {
    await prisma.user.update({
      where: { id: userId },
      data: { pendingApproval: false, active: true },
    })
    return NextResponse.json({ success: true, action: 'approved' })
  } else {
    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ success: true, action: 'rejected' })
  }
}
