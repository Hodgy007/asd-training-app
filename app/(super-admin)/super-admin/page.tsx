import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users, BookOpen, Download, ArrowRight, AlertCircle } from 'lucide-react'
import { isCharityLevel, hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session || !isCharityLevel(session)) redirect('/login')

  const [orgCount, totalUsers, totalLessons, orgs, totalDownloads, downloadsPerOrg, pendingOrgCount] = await Promise.all([
    prisma.organisation.count({ where: { pendingApproval: false } }),
    prisma.user.count({
      where: { role: { notIn: ['SUPER_ADMIN'] } },
    }),
    prisma.trainingProgress.count({ where: { completed: true } }),
    prisma.organisation.findMany({
      where: { pendingApproval: false },
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.libraryDocumentEvent.count({ where: { action: 'download' } }),
    prisma.libraryDocumentEvent.groupBy({
      by: ['organisationId'],
      where: { action: 'download', organisationId: { not: null } },
      _count: { _all: true },
    }),
    prisma.organisation.count({ where: { pendingApproval: true } }),
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

  const orgDownloadsMap = new Map<string, number>()
  for (const row of downloadsPerOrg) {
    if (row.organisationId) orgDownloadsMap.set(row.organisationId, row._count._all)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Charity Admin Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Platform-wide statistics and organisation summary.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{orgCount}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Organisations</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-sage-100 dark:bg-sage-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-sage-600 dark:text-sage-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalUsers}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Total users</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-warm-100 dark:bg-warm-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-warm-500 dark:text-warm-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalLessons}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Completed lessons</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalDownloads}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Downloads</p>
          </div>
        </div>
      </div>

      {/* Pending org registrations banner */}
      {pendingOrgCount > 0 && hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS) && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            <strong>{pendingOrgCount}</strong> organisation{pendingOrgCount !== 1 ? 's' : ''} awaiting approval.
          </p>
          <Link
            href="/super-admin/organisations?tab=pending"
            className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 whitespace-nowrap"
          >
            Review now &rarr;
          </Link>
        </div>
      )}

      {/* Org summary table */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-4 border-b border-calm-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Organisations</h2>
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
              <tr className="border-b border-calm-200 dark:border-slate-700 bg-calm-50 dark:bg-slate-800/50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">URL ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Users</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Lessons</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Downloads</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody className={orgs.length > 0 ? 'animate-stagger' : ''}>
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400 dark:text-slate-500">
                    No organisations yet.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr key={org.id} className="border-b border-calm-100 dark:border-slate-700 hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/super-admin/organisations/${org.id}`}
                        className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{org.slug}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{org._count.users}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{orgLessonsMap.get(org.id) ?? 0}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{orgDownloadsMap.get(org.id) ?? 0}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                          org.active
                            ? 'bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
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
