import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectiveOrgSettings } from '@/lib/org-hierarchy'
import { LEAF_ROLES } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const org = await prisma.organisation.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, active: true, pendingApproval: true, orgType: true },
  })

  if (!org || !org.active || org.pendingApproval || org.orgType !== 'ORGANISATION') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const settings = await getEffectiveOrgSettings(org.id)
  const allowed = new Set(settings.allowedRoles)
  const roles = LEAF_ROLES.filter((r) => allowed.has(r))

  return NextResponse.json({ orgName: org.name, roles })
}
