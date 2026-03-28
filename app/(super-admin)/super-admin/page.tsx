import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users, BookOpen, ArrowRight } from 'lucide-react'
import { isSuperAdmin } from '@/lib/rbac'

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) redirect('/login')

  const [orgCount, totalUsers, totalLessons, orgs] = await Promise.all([
    prisma.organisation.count(),
    prisma.user.count({
      where: { role: { notIn: ['SUPER_ADMIN'] } },
    }),
    prisma.trainingProgress.count({ where: { completed: true } }),
    prisma.organisation.findMany({
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Fetch per-org lesson completions in one query
  const lessonsPerOrg = await prisma.trainingProgress.groupBy({
    by: ['userId'],
    where: { completed: true },
    _count: { _all: true },
  })

  // Map userId → completions count
  const userLessonsMap = new Map<string, number>()
  for (const row of lessonsPerOrg) {
    userLessonsMap.set(row.userId, row._count._all)
  }

  // Get all users with orgId so we can sum per org
  const allUsers = await prisma.user.findMany({
    where: { organisationId: { not: null } },
    select: { id: true, organisationId: true },
  })

  const orgLessonsMap = new Map<string, number>()
  for (const u of allUsers) {
    if (!u.organisationId) continue
    const lessons = userLessonsMap.get(u.id) ?? 0
    orgLessonsMap.set(u.organisationId, (orgLessonsMap.get(u.organisationId) ?? 0) + lessons)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Super Admin Overview</h1>
        <p className="text-slate-500 mt-1">Platform-wide statistics and organisation summary.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{orgCount}</p>
            <p className="text-sm text-slate-500">Organisations</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-sage-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
            <p className="text-sm text-slate-500">Total users</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-warm-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-warm-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{totalLessons}</p>
            <p className="text-sm text-slate-500">Completed lessons</p>
          </div>
        </div>
      </div>

      {/* Org summary table */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-4 border-b border-calm-200">
          <h2 className="text-lg font-semibold text-slate-900">Organisations</h2>
          <Link
            href="/super-admin/organisations"
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-calm-200 bg-calm-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Users</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Lessons</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No organisations yet.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr key={org.id} className="border-b border-calm-100 hover:bg-calm-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/super-admin/organisations/${org.id}`}
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{org.slug}</td>
                    <td className="px-4 py-3 text-slate-700">{org._count.users}</td>
                    <td className="px-4 py-3 text-slate-700">{orgLessonsMap.get(org.id) ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                          org.active
                            ? 'bg-sage-100 text-sage-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {org.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
