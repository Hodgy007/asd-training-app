import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { canAccessJobs } from '@/lib/rbac'
import { listVisibleJobsForUser } from '@/lib/jobs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!canAccessJobs(session) || !session?.user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const user = {
    id: session.user.id,
    role: session.user.role,
    organisationId: session.user.organisationId ?? null,
  }
  const jobs = await listVisibleJobsForUser(user)
  return NextResponse.json({ jobs })
}
