import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageJobs } from '@/lib/rbac'
import { autoCloseExpiredJobs } from '@/lib/jobs'
import { format } from 'date-fns'
import { HowToPanel } from '@/components/howto/panel'
import JobsHowTo from '@/components/howto/super-admin/jobs'

export const dynamic = 'force-dynamic'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-800 dark:bg-slate-700/40 dark:text-slate-200',
  PUBLISHED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-700/40 dark:text-emerald-200',
  CLOSED: 'bg-amber-100 text-amber-800 dark:bg-amber-700/40 dark:text-amber-200',
  ARCHIVED: 'bg-slate-200 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
}

export default async function JobsListPage() {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) redirect('/super-admin')

  await autoCloseExpiredJobs()

  // Lists both tiers: the charity's own platform-wide jobs (organisationId
  // null) and jobs owned by individual organisations, which charity admins
  // oversee. The Owner column distinguishes them.
  const jobs = await prisma.jobOpening.findMany({
    include: {
      _count: { select: { assignments: true, attachments: true } },
      organisation: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Job Openings</h1>
        <Link
          href="/super-admin/jobs/new"
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm"
        >
          New job opening
        </Link>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Employer</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Status</th>
              <th className="p-3">Closes</th>
              <th className="p-3">Targeting</th>
              <th className="p-3">Assignees</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t">
                <td className="p-3 font-medium">{j.title}</td>
                <td className="p-3">{j.employer}</td>
                <td className="p-3 text-slate-600 dark:text-slate-300">
                  {j.organisation?.name ?? 'Ambitious about Autism'}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE[j.status]}`}>
                    {j.status}
                  </span>
                </td>
                <td className="p-3">{format(j.closingDate, 'd MMM yyyy')}</td>
                <td className="p-3 text-slate-600 dark:text-slate-300">
                  {j.organisationId !== null
                    ? 'That organisation only'
                    : j.targetOrgIds.length === 0
                      ? 'All orgs'
                      : `${j.targetOrgIds.length} orgs`}
                </td>
                <td className="p-3">{j._count.assignments}</td>
                <td className="p-3">
                  <Link href={`/super-admin/jobs/${j.id}`} className="text-primary-600">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No job openings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <HowToPanel>
        <JobsHowTo />
      </HowToPanel>
    </div>
  )
}
