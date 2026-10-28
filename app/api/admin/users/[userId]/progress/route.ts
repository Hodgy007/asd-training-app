import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function DELETE(_req: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId } })
  if (!user || user.organisationId !== session.user.organisationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { count } = await prisma.trainingProgress.deleteMany({
    where: { userId: params.userId },
  })

  return NextResponse.json({ success: true, deleted: count })
}
