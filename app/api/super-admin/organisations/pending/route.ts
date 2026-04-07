import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const pendingOrgs = await prisma.organisation.findMany({
    where: { pendingApproval: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ orgs: pendingOrgs, count: pendingOrgs.length })
}

const actionSchema = z.object({
  orgId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
})

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { orgId, action } = parsed.data

  const org = await prisma.organisation.findUnique({ where: { id: orgId } })
  if (!org || !org.pendingApproval) {
    return NextResponse.json({ error: 'Organisation not found or not pending' }, { status: 404 })
  }

  if (action === 'approve') {
    await prisma.organisation.update({
      where: { id: orgId },
      data: {
        pendingApproval: false,
        active: true,
      },
    })
    return NextResponse.json({ message: `${org.name} has been approved and activated.` })
  } else {
    await prisma.organisation.delete({ where: { id: orgId } })
    return NextResponse.json({ message: `${org.name} registration has been rejected.` })
  }
}
