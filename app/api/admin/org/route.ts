import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { canManageChildOrg } from '@/lib/org-hierarchy'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sessionOrgId = session.user.organisationId
  if (!sessionOrgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const targetOrgId = searchParams.get('orgId')
  let orgId = sessionOrgId

  if (targetOrgId && targetOrgId !== sessionOrgId && session.user.isParentOrg) {
    const canManage = await canManageChildOrg(session, targetOrgId)
    if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    orgId = targetOrgId
  } else if (targetOrgId && targetOrgId !== sessionOrgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      allowedRoles: true,
      allowedProgramIds: true,
      isParentOrg: true,
      _count: { select: { childOrgs: true } },
    },
  })

  return NextResponse.json({
    ...org,
    childOrgCount: org?._count?.childOrgs ?? 0,
  })
}
