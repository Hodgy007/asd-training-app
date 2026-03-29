import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all active modules grouped by program
  const allModules = await prisma.module.findMany({
    where: { active: true },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
    select: { id: true, title: true, programId: true, program: { select: { name: true } } },
  })

  const allModuleIds = allModules.map((m) => m.id)

  const orgs = await prisma.organisation.findMany({
    select: {
      id: true, name: true, slug: true, allowedProgramIds: true,
      users: {
        where: { role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] } },
        select: {
          id: true,
          trainingProgress: { where: { completed: true }, select: { moduleId: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const report = orgs.map((org) => {
    const totalUsers = org.users.length
    // Only report on modules whose program is in the org's allowedProgramIds
    const orgModuleIds = allModules
      .filter((m) => org.allowedProgramIds.includes(m.programId))
      .map((m) => m.id)

    const modules = orgModuleIds.map((moduleId) => {
      const mod = allModules.find((m) => m.id === moduleId)
      const completions = org.users.filter((u) =>
        u.trainingProgress.some((p) => p.moduleId === moduleId)
      ).length
      return {
        moduleId,
        moduleName: mod?.title ?? moduleId,
        programName: mod?.program?.name ?? 'Unknown',
        completions,
        totalUsers,
        pct: totalUsers > 0 ? Math.round((completions / totalUsers) * 100) : 0,
      }
    })
    return {
      orgId: org.id,
      orgName: org.name,
      orgSlug: org.slug,
      totalUsers,
      modules,
    }
  })

  // Also return allModules metadata for legend
  const moduleMeta = allModules.map((m) => ({
    id: m.id,
    title: m.title,
    programId: m.programId,
    programName: m.program.name,
  }))

  return NextResponse.json({ report, moduleMeta })
}
