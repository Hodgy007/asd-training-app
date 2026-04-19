import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageJobs } from '@/lib/rbac'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { jobId: string; assignmentId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const assignment = await prisma.jobAssignment.findUnique({ where: { id: params.assignmentId } })
  if (!assignment || assignment.jobId !== params.jobId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await prisma.jobAssignment.delete({ where: { id: params.assignmentId } })
  return NextResponse.json({ ok: true })
}
