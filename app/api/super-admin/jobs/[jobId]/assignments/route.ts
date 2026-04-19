import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageJobs } from '@/lib/rbac'
import { assignJobSchema } from '@/lib/validators/jobs'

export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session) || !session?.user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const parsed = assignJobSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }
  const assignment = await prisma.jobAssignment.upsert({
    where: { jobId_userId: { jobId: params.jobId, userId: parsed.data.userId } },
    create: {
      jobId: params.jobId,
      userId: parsed.data.userId,
      assignedById: session.user.id,
      note: parsed.data.note ?? null,
    },
    update: { note: parsed.data.note ?? null, assignedById: session.user.id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  })
  return NextResponse.json({ assignment }, { status: 201 })
}
