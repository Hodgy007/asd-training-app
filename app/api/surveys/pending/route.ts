import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isLeafRole } from '@/lib/rbac'
import { getPendingSurveys } from '@/lib/survey-db'
import type { Role } from '@prisma/client'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isLeafRole(session)) {
    return NextResponse.json([], { status: 200 })
  }

  const surveys = await getPendingSurveys(
    session.user.id,
    session.user.role as Role,
    session.user.organisationId ?? null
  )

  return NextResponse.json(surveys)
}
