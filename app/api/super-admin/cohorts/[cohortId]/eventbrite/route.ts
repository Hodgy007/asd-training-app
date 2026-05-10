import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const VALID_AUDIENCES = new Set(['EDUCATION', 'EMPLOYER'])

/**
 * Toggle catalogue visibility + audience on the cohort's Eventbrite event row.
 * Used by the cohort detail page when the cohort is Eventbrite-sourced.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { cohortId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_COHORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const link = await prisma.cohortEventbriteEvent.findUnique({
    where: { cohortId: params.cohortId },
  })
  if (!link) {
    return NextResponse.json(
      { error: 'This cohort is not linked to an Eventbrite event.' },
      { status: 404 },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const data: { purchasable?: boolean; audience?: 'EDUCATION' | 'EMPLOYER' } = {}
  if (typeof body.purchasable === 'boolean') data.purchasable = body.purchasable
  if (body.audience && VALID_AUDIENCES.has(body.audience)) data.audience = body.audience

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.cohortEventbriteEvent.update({
    where: { id: link.id },
    data,
  })
  return NextResponse.json({ eventbriteEvent: updated })
}
