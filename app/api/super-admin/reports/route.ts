import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { getJobStats } from '@/lib/jobs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all active modules grouped by program
  const allModules = await prisma.module.findMany({
    where: { active: true },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
    select: {
      id: true,
      title: true,
      programId: true,
      gatsbyBenchmarks: true,
      program: { select: { name: true } },
    },
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
    gatsbyBenchmarks: m.gatsbyBenchmarks,
  }))

  // ── CV Builder stats ──
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [cvTotal, cvByStatus, cvRecent, cvByTemplate] = await Promise.all([
    prisma.cV.count(),
    prisma.cV.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.cV.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.cV.groupBy({ by: ['template'], _count: { id: true } }),
  ])

  const cvStats = {
    total: cvTotal,
    byStatus: Object.fromEntries(cvByStatus.map((s) => [s.status, s._count.id])),
    recentLast30Days: cvRecent,
    byTemplate: Object.fromEntries(cvByTemplate.map((t) => [t.template, t._count.id])),
  }

  // ── Careers Advisor stats ──
  const [advisorTotal, advisorByStatus, advisorRecent] = await Promise.all([
    prisma.careerAdvisorSession.count(),
    prisma.careerAdvisorSession.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.careerAdvisorSession.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ])

  const advisorStats = {
    total: advisorTotal,
    byStatus: Object.fromEntries(advisorByStatus.map((s) => [s.status, s._count.id])),
    recentLast30Days: advisorRecent,
  }

  // ── Workshop, download, and survey response counts ──
  const [workshopCount, downloadCount, surveyResponseCount] = await Promise.all([
    prisma.classSession.count(),
    prisma.libraryDocumentEvent.count({ where: { action: 'download' } }),
    prisma.surveyResponse.count(),
  ])

  // ── Job Openings stats ──
  const jobStats = await getJobStats()

  return NextResponse.json({ report, moduleMeta, cvStats, advisorStats, workshopCount, downloadCount, surveyResponseCount, jobStats })
}
