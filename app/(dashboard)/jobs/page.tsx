import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessJobs } from '@/lib/rbac'
import { listVisibleJobsForUser, resolveJobVisibilityUser } from '@/lib/jobs'
import { JobsClient } from './jobs-client'
import { HowToPanel } from '@/components/howto/panel'
import JobsHowTo from '@/components/howto/learner/jobs'

export const dynamic = 'force-dynamic'

function toCardAndDetail(j: Awaited<ReturnType<typeof listVisibleJobsForUser>>[number]) {
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

export default async function JobsPage() {
  const session = await getServerSession(authOptions)
  if (!canAccessJobs(session) || !session?.user) redirect('/dashboard')
  const jobs = await listVisibleJobsForUser(await resolveJobVisibilityUser(session.user))
  return (
    <>
      <JobsClient initialJobs={jobs.map(toCardAndDetail)} initialSelectedId={null} />
      <HowToPanel>
        <JobsHowTo />
      </HowToPanel>
    </>
  )
}
