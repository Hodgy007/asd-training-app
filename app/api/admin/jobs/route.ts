import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isOrgAdmin } from '@/lib/rbac'
import { canAdminManageOrg } from '@/lib/org-hierarchy'
import { autoCloseExpiredJobs } from '@/lib/jobs'
import { createJobSchema } from '@/lib/validators/jobs'

/**
 * Organisation-tier job openings. These belong to one organisation and are
 * visible only to its learners (and to its child orgs' learners when it is a
 * parent org). The charity's own platform-wide tier lives under
 * /api/super-admin/jobs and is not reachable from here.
 *
 * A parent org may manage a child org's jobs via ?orgId=, mirroring the other
 * admin endpoints.
 */

/** Resolve which org this request is acting on, or null if not permitted. */
async function resolveOrgId(
  session: Session | null,
  req: NextRequest
): Promise<string | null> {
  if (!session?.user || !isOrgAdmin(session)) return null
  const requested = new URL(req.url).searchParams.get('orgId')
  const orgId = requested ?? session.user.organisationId ?? null
  if (!orgId) return null
  return (await canAdminManageOrg(session, orgId)) ? orgId : null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const orgId = await resolveOrgId(session, req)
  if (!orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await autoCloseExpiredJobs()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const search = searchParams.get('search')

  const jobs = await prisma.jobOpening.findMany({
    where: {
      organisationId: orgId,
      ...(status ? { status: status as never } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { employer: { contains: search, mode: 'insensitive' } },
              { summary: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { assignments: true, attachments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ jobs })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const orgId = await resolveOrgId(session, req)
  if (!orgId || !session?.user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = createJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  // organisationId is deliberately absent from the schema and set from the
  // session here — a client must never be able to publish into another org,
  // or onto the platform-wide charity tier by sending null.
  const { targetOrgIds: _ignored, ...data } = parsed.data

  const job = await prisma.jobOpening.create({
    data: {
      ...data,
      targetOrgIds: [],
      organisationId: orgId,
      createdById: session.user.id,
    },
  })

  return NextResponse.json({ job }, { status: 201 })
}
