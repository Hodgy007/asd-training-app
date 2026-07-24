import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { canManageChildOrg, getAllOrgIds } from '@/lib/org-hierarchy'
import { getJobStats } from '@/lib/jobs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sessionOrgId = session.user.organisationId
  if (!sessionOrgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const targetOrgId = searchParams.get('orgId')

  // Determine which org(s) to report on
  let orgId = sessionOrgId
  let orgIds: string[] = [sessionOrgId]
  if (targetOrgId && session.user.isParentOrg) {
    if (targetOrgId === 'all') {
      orgIds = await getAllOrgIds(sessionOrgId)
      orgId = sessionOrgId
    } else {
      const canManage = await canManageChildOrg(session, targetOrgId)
      if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      orgId = targetOrgId
      orgIds = [targetOrgId]
    }
  } else if (!targetOrgId && session.user.isParentOrg) {
    // Default for parent orgs: aggregate across all children
    orgIds = await getAllOrgIds(sessionOrgId)
  }

  // Get org's allowed programs and their modules
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { allowedProgramIds: true },
  })

  const allowedProgramIds = org?.allowedProgramIds ?? []

  // Fetch modules for allowed programs
  const modules = await prisma.module.findMany({
    where: { programId: { in: allowedProgramIds }, active: true },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
    select: {
      id: true,
      title: true,
      programId: true,
      gatsbyBenchmarks: true,
      program: { select: { name: true } },
    },
  })

  const moduleIds = modules.map((m) => m.id)

  const users = await prisma.user.findMany({
    where: {
      organisationId: { in: orgIds },
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

  const moduleStats = moduleIds.map((moduleId) => {
    const mod = modules.find((m) => m.id === moduleId)
    const completions = users.filter((u) =>
      u.trainingProgress.some((p) => p.moduleId === moduleId)
    ).length
    return {
      moduleId,
      moduleName: mod?.title ?? moduleId,
      programName: mod?.program?.name ?? 'Unknown',
      gatsbyBenchmarks: mod?.gatsbyBenchmarks ?? [],
      completions,
      totalUsers: users.length,
      pct: users.length > 0 ? Math.round((completions / users.length) * 100) : 0,
    }
  })

  const orgUserIds = users.map((u) => u.id)

  // ── Workshop, download, and survey response counts (org-scoped) ──
  const [workshopCount, downloadCount, surveyResponseCount] = await Promise.all([
    prisma.classSession.count({ where: { organisationId: { in: orgIds } } }),
    prisma.libraryDocumentEvent.count({ where: { organisationId: { in: orgIds }, action: 'download' } }),
    prisma.surveyResponse.count({ where: { userId: { in: orgUserIds } } }),
  ])

  // ── Job Openings stats (scoped to org) ──
  const jobStats = await getJobStats(orgId)

  return NextResponse.json({
    totalUsers: users.length,
    modules: moduleStats,
    users: users.map((u) => ({
      id: u.id, name: u.name, email: u.email,
      completedModules: u.trainingProgress.map((p) => p.moduleId),
      totalCompleted: u.trainingProgress.length,
    })),
    workshopCount,
    downloadCount,
    surveyResponseCount,
    jobStats,
  })
}
