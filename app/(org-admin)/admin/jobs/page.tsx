import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isOrgAdmin } from '@/lib/rbac'
import { autoCloseExpiredJobs } from '@/lib/jobs'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-800 dark:bg-slate-700/40 dark:text-slate-200',
  PUBLISHED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-700/40 dark:text-emerald-200',
  CLOSED: 'bg-amber-100 text-amber-800 dark:bg-amber-700/40 dark:text-amber-200',
  ARCHIVED: 'bg-slate-200 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
}

/**
 * An organisation's own job openings. Charity-tier jobs (organisationId null)
 * are deliberately not listed here — they are visible to this org's learners
 * but are the charity's to manage, not the org's.
 */
export default async function OrgJobsPage() {
  const session = await getServerSession(authOptions)
  if (!isOrgAdmin(session) || !session?.user?.organisationId) redirect('/admin')

  await autoCloseExpiredJobs()

  const orgId = session.user.organisationId

  const [jobs, charityJobCount] = await Promise.all([
    prisma.jobOpening.findMany({
      where: { organisationId: orgId },
      include: { _count: { select: { assignments: true, attachments: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.jobOpening.count({
      where: {
        organisationId: null,
        status: 'PUBLISHED',
        OR: [{ targetOrgIds: { isEmpty: true } }, { targetOrgIds: { has: orgId } }],
      },
    }),
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Job Openings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Opportunities you post for your own learners.
          </p>
        </div>
        <Link
          href="/admin/jobs/new"
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm"
        >
          New job opening
        </Link>
      </div>

      {charityJobCount > 0 && (
        <p className="text-sm text-slate-600 dark:text-slate-300 bg-calm-50 dark:bg-slate-800 border border-calm-200 dark:border-slate-700 rounded-xl px-4 py-3">
          Your learners can also see <strong>{charityJobCount}</strong> job
          {charityJobCount === 1 ? '' : 's'} published by Ambitious about Autism. Those are
          managed by the charity and are not listed here.
        </p>
      )}

      {jobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-calm-200 dark:border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            You haven&apos;t posted any job openings yet.
          </p>
          <Link
            href="/admin/jobs/new"
            className="inline-block mt-4 text-primary-600 dark:text-primary-400 font-semibold text-sm"
          >
            Post your first opening
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-slate-900 border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-left">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Employer</th>
                <th className="p-3">Status</th>
                <th className="p-3">Closes</th>
                <th className="p-3">Assignees</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="p-3 font-medium">{j.title}</td>
                  <td className="p-3">{j.employer}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_BADGE[j.status]}`}>
                      {j.status}
                    </span>
                  </td>
                  <td className="p-3">{format(j.closingDate, 'd MMM yyyy')}</td>
                  <td className="p-3">{j._count.assignments}</td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/jobs/${j.id}`}
                      className="text-primary-600 dark:text-primary-400 font-semibold"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
