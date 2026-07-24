import { getServerSession } from 'next-auth'
import type { Session } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isOrgAdmin } from '@/lib/rbac'
import { canAdminManageOrg } from '@/lib/org-hierarchy'
import { updateJobSchema } from '@/lib/validators/jobs'

/**
 * Load a job only if the caller's organisation owns it.
 *
 * Ownership is checked against the job's own organisationId rather than the
 * requested org, so a charity-tier job (organisationId null) can never be
 * edited or deleted from the org-admin endpoints.
 */
async function loadOwnedJob(
  session: Session | null,
  jobId: string
) {
  if (!session?.user || !isOrgAdmin(session)) return null

  const job = await prisma.jobOpening.findUnique({
    where: { id: jobId },
    select: { id: true, organisationId: true },
  })
  if (!job?.organisationId) return null

  return (await canAdminManageOrg(session, job.organisationId)) ? job : null
}

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!(await loadOwnedJob(session, params.jobId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const job = await prisma.jobOpening.findUnique({
    where: { id: params.jobId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      attachments: true,
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  })

  return NextResponse.json({ job })
}

export async function PATCH(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!(await loadOwnedJob(session, params.jobId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = updateJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  // Never let an update move a job between tiers or into another org.
  const { targetOrgIds: _ignored, ...data } = parsed.data

  const job = await prisma.jobOpening.update({ where: { id: params.jobId }, data })
  return NextResponse.json({ job })
}

export async function DELETE(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!(await loadOwnedJob(session, params.jobId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.jobOpening.delete({ where: { id: params.jobId } })
  return NextResponse.json({ ok: true })
}
