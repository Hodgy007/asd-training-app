import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageJobs } from '@/lib/rbac'
import { updateJobSchema } from '@/lib/validators/jobs'

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const job = await prisma.jobOpening.findUnique({
    where: { id: params.jobId },
    include: {
      attachments: true,
      assignments: {
        include: { user: { select: { id: true, name: true, email: true, role: true, organisationId: true } } },
        orderBy: { createdAt: 'desc' },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ job })
}

export async function PATCH(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = updateJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }
  const job = await prisma.jobOpening.update({
    where: { id: params.jobId },
    data: parsed.data,
  })
  return NextResponse.json({ job })
}

export async function DELETE(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await prisma.jobOpening.delete({ where: { id: params.jobId } })
  return NextResponse.json({ ok: true })
}
