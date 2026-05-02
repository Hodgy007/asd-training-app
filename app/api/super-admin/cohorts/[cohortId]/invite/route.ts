import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { generateInviteCode } from '@/lib/cohort'

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

async function findCohort(cohortId: string) {
  return prisma.organisation.findFirst({ where: { id: cohortId, orgType: 'COHORT' } })
}

function summarise(org: { inviteCode: string | null; inviteEnabled: boolean; inviteExpiresAt: Date | null }) {
  return {
    code: org.inviteCode,
    enabled: org.inviteEnabled,
    expiresAt: org.inviteExpiresAt,
  }
}

export async function GET(_req: NextRequest, { params }: { params: { cohortId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const cohort = await findCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(summarise(cohort))
}

/** Generate (or regenerate) the invite code. The previous code is invalidated. */
export async function POST(_req: NextRequest, { params }: { params: { cohortId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const cohort = await findCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (cohort.lifecycleStatus === 'ARCHIVED') {
    return NextResponse.json({ error: 'Cannot generate an invite for an archived cohort.' }, { status: 400 })
  }

  // Loop on collision (extremely rare but the column has a unique index).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode()
    try {
      const updated = await prisma.organisation.update({
        where: { id: params.cohortId },
        data: { inviteCode: code, inviteEnabled: true },
      })
      return NextResponse.json(summarise(updated))
    } catch (e: unknown) {
      const err = e as { code?: string; meta?: { target?: string[] } }
      if (err.code === 'P2002' && err.meta?.target?.includes('inviteCode')) continue
      throw e
    }
  }
  return NextResponse.json({ error: 'Could not generate a unique invite code.' }, { status: 500 })
}

/** Toggle enabled/disabled or update expiry. */
export async function PATCH(req: NextRequest, { params }: { params: { cohortId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const cohort = await findCohort(params.cohortId)
  if (!cohort) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (parsed.data.enabled !== undefined) data.inviteEnabled = parsed.data.enabled
  if (parsed.data.expiresAt !== undefined) {
    data.inviteExpiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
  }

  const updated = await prisma.organisation.update({
    where: { id: params.cohortId },
    data,
  })
  return NextResponse.json(summarise(updated))
}
