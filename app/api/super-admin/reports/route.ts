import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { ALL_MODULE_IDS } from '@/lib/modules'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgs = await prisma.organisation.findMany({
    select: {
      id: true, name: true, slug: true,
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
    const modules = ALL_MODULE_IDS.map((moduleId) => {
      const completions = org.users.filter((u) =>
        u.trainingProgress.some((p) => p.moduleId === moduleId)
      ).length
      return { moduleId, completions, totalUsers, pct: totalUsers > 0 ? Math.round((completions / totalUsers) * 100) : 0 }
    })
    return { orgId: org.id, orgName: org.name, orgSlug: org.slug, totalUsers, modules }
  })

  return NextResponse.json(report)
}
