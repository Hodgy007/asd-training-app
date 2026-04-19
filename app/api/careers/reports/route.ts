import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canManageStudents, CDO_MANAGED_ROLES } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

const MANAGED_ROLES: Role[] = CDO_MANAGED_ROLES as Role[]

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!canManageStudents(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session!.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedProgramIds: true },
  })
  const allowedProgramIds = org?.allowedProgramIds ?? []

  const modules = await prisma.module.findMany({
    where: { programId: { in: allowedProgramIds }, active: true },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
    select: {
      id: true,
      title: true,
      programId: true,
      program: { select: { name: true } },
    },
  })

  const users = await prisma.user.findMany({
    where: {
      organisationId: orgId,
      role: { in: MANAGED_ROLES },
      active: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      trainingProgress: {
        where: { completed: true },
        select: { moduleId: true, completedAt: true, score: true },
      },
    },
  })

  const moduleStats = modules.map((mod) => {
    const completions = users.filter((u) =>
      u.trainingProgress.some((p) => p.moduleId === mod.id)
    ).length
    return {
      moduleId: mod.id,
      moduleName: mod.title,
      programName: mod.program?.name ?? 'Unknown',
      completions,
      totalUsers: users.length,
      pct: users.length > 0 ? Math.round((completions / users.length) * 100) : 0,
    }
  })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const studentIds = users.map((u) => u.id)

  const [cvTotal, cvByStatus, cvRecent, cvByTemplate] = await Promise.all([
    prisma.cV.count({ where: { userId: { in: studentIds } } }),
    prisma.cV.groupBy({ by: ['status'], _count: { id: true }, where: { userId: { in: studentIds } } }),
    prisma.cV.count({ where: { userId: { in: studentIds }, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.cV.groupBy({ by: ['template'], _count: { id: true }, where: { userId: { in: studentIds } } }),
  ])

  const cvStats = {
    total: cvTotal,
    byStatus: Object.fromEntries(cvByStatus.map((s) => [s.status, s._count.id])),
    recentLast30Days: cvRecent,
    byTemplate: Object.fromEntries(cvByTemplate.map((t) => [t.template, t._count.id])),
  }

  const [advisorTotal, advisorByStatus, advisorRecent] = await Promise.all([
    prisma.careerAdvisorSession.count({ where: { userId: { in: studentIds } } }),
    prisma.careerAdvisorSession.groupBy({ by: ['status'], _count: { id: true }, where: { userId: { in: studentIds } } }),
    prisma.careerAdvisorSession.count({ where: { userId: { in: studentIds }, createdAt: { gte: thirtyDaysAgo } } }),
  ])

  const advisorStats = {
    total: advisorTotal,
    byStatus: Object.fromEntries(advisorByStatus.map((s) => [s.status, s._count.id])),
    recentLast30Days: advisorRecent,
  }

  return NextResponse.json({
    totalStudents: users.length,
    byRole: {
      STUDENT: users.filter((u) => u.role === 'STUDENT').length,
      INTERN: users.filter((u) => u.role === 'INTERN').length,
      EMPLOYEE: users.filter((u) => u.role === 'EMPLOYEE').length,
    },
    modules: moduleStats,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      totalCompleted: u.trainingProgress.length,
      completedModules: u.trainingProgress.map((p) => p.moduleId),
    })),
    cvStats,
    advisorStats,
  })
}
