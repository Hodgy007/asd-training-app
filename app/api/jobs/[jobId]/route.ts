import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { canAccessJobs } from '@/lib/rbac'
import { getJobForUser } from '@/lib/jobs'

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!canAccessJobs(session) || !session?.user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const job = await getJobForUser(params.jobId, {
    id: session.user.id,
    role: session.user.role,
    organisationId: session.user.organisationId ?? null,
  })
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ job })
}
