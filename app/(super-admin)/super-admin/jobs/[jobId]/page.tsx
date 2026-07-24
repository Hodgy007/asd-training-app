import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageJobs } from '@/lib/rbac'
import { JobBuilderForm } from '@/components/jobs/job-builder-form'
import { JobAttachmentsPanel } from '@/components/jobs/job-attachments-panel'
import { JobAssignmentsPanel } from '@/components/jobs/job-assignments-panel'

export const dynamic = 'force-dynamic'

export default async function EditJobPage({ params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) redirect('/super-admin')

  const [job, organisations, candidates] = await Promise.all([
    prisma.jobOpening.findUnique({
      where: { id: params.jobId },
      include: {
        attachments: true,
        assignments: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
    prisma.organisation.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { role: 'LEARNER', active: true },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { email: 'asc' },
    }),
  ])
  if (!job) notFound()

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-semibold">Edit job opening</h1>
      <JobBuilderForm
        organisations={organisations}
        initial={{
          id: job.id,
          title: job.title,
          employer: job.employer,
          employerLogoUrl: job.employerLogoUrl,
          location: job.location,
          locationType: job.locationType,
          employmentType: job.employmentType,
          summary: job.summary,
          description: job.description,
          skills: job.skills,
          autismFriendlyNotes: job.autismFriendlyNotes,
          salary: job.salary,
          hoursPerWeek: job.hoursPerWeek,
          startDate: job.startDate,
          duration: job.duration,
          applyUrl: job.applyUrl,
          applyEmail: job.applyEmail,
          contactName: job.contactName,
          contactEmail: job.contactEmail,
          closingDate: job.closingDate.toISOString(),
          status: job.status,
          targetOrgIds: job.targetOrgIds,
          targetRoles: job.targetRoles,
        }}
      />
      <JobAttachmentsPanel jobId={job.id} initial={job.attachments.map((a) => ({ id: a.id, filename: a.filename, url: `/api/jobs/${job.id}/attachments/${a.id}/file`, sizeBytes: a.sizeBytes }))} />
      <JobAssignmentsPanel
        jobId={job.id}
        initial={job.assignments.map((a) => ({ id: a.id, note: a.note, user: a.user }))}
        candidates={candidates}
      />
    </div>
  )
}
