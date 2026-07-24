import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessJobs } from '@/lib/rbac'
import { getJobForUser, listVisibleJobsForUser, resolveJobVisibilityUser } from '@/lib/jobs'
import { JobsClient } from '../jobs-client'

export const dynamic = 'force-dynamic'

export default async function JobDeepLink({ params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!canAccessJobs(session) || !session?.user) redirect('/dashboard')

  const user = await resolveJobVisibilityUser(session.user)

  const single = await getJobForUser(params.jobId, user)
  if (!single) notFound()

  const jobs = await listVisibleJobsForUser(user)
  if (!jobs.find((j) => j.id === single.id)) jobs.unshift(single)

  const toCardAndDetail = (j: (typeof jobs)[number]) => {
    const assignment = j.assignments[0] ?? null
    return {
      id: j.id,
      title: j.title,
      employer: j.employer,
      employerLogoUrl: j.employerLogoUrl,
      location: j.location,
      locationType: j.locationType,
      employmentType: j.employmentType,
      summary: j.summary,
      description: j.description,
      skills: j.skills,
      autismFriendlyNotes: j.autismFriendlyNotes,
      salary: j.salary,
      hoursPerWeek: j.hoursPerWeek,
      startDate: j.startDate,
      duration: j.duration,
      applyUrl: j.applyUrl,
      applyEmail: j.applyEmail,
      contactName: j.contactName,
      contactEmail: j.contactEmail,
      closingDate: j.closingDate.toISOString(),
      status: j.status,
      attachments: j.attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        url: `/api/jobs/${j.id}/attachments/${a.id}/file`,
        sizeBytes: a.sizeBytes,
      })),
      hasAssignment: Boolean(assignment),
      assignmentNote: assignment?.note ?? null,
    }
  }

  return <JobsClient initialJobs={jobs.map(toCardAndDetail)} initialSelectedId={params.jobId} />
}
