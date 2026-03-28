import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedModuleIds: true },
  })

  const users = await prisma.user.findMany({
    where: {
      organisationId: orgId,
      role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] },
    },
    select: {
      id: true, name: true, email: true,
      trainingProgress: {
        where: { completed: true },
        select: { moduleId: true, completedAt: true, score: true },
      },
    },
  })

  const moduleIds = org?.allowedModuleIds ?? []
  const moduleStats = moduleIds.map((moduleId) => {
    const completions = users.filter((u) =>
      u.trainingProgress.some((p) => p.moduleId === moduleId)
    ).length
    return {
      moduleId,
      completions,
      totalUsers: users.length,
      pct: users.length > 0 ? Math.round((completions / users.length) * 100) : 0,
    }
  })

  return NextResponse.json({
    totalUsers: users.length,
    modules: moduleStats,
    users: users.map((u) => ({
      id: u.id, name: u.name, email: u.email,
      completedModules: u.trainingProgress.map((p) => p.moduleId),
      totalCompleted: u.trainingProgress.length,
    })),
  })
}
