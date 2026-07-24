import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isOrgAdmin } from '@/lib/rbac'
import { canAdminManageOrg } from '@/lib/org-hierarchy'
import { JobBuilderForm } from '@/components/jobs/job-builder-form'

export const dynamic = 'force-dynamic'

export default async function EditOrgJobPage({ params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!isOrgAdmin(session) || !session?.user?.organisationId) redirect('/admin')

  const job = await prisma.jobOpening.findUnique({ where: { id: params.jobId } })

  // Ownership is checked against the job's own organisationId, so a
  // charity-tier job (organisationId null) is never editable from here even
  // though this org's learners can see it.
  if (!job?.organisationId) notFound()
  if (!(await canAdminManageOrg(session, job.organisationId))) notFound()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">{job.title}</h1>
      <JobBuilderForm
        organisations={[]}
        tier="organisation"
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
          closingDate: job.closingDate.toISOString().slice(0, 10),
          status: job.status,
          targetOrgIds: job.targetOrgIds,
          targetRoles: job.targetRoles,
        }}
      />
    </div>
  )
}
