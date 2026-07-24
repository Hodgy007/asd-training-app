import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { JobBuilderForm } from '@/components/jobs/job-builder-form'

export const dynamic = 'force-dynamic'

export default async function NewOrgJobPage() {
  const session = await getServerSession(authOptions)
  if (!isOrgAdmin(session) || !session?.user?.organisationId) redirect('/admin')

  // No organisation list is passed: ownership comes from the session and the
  // org-targeting control is hidden on this tier.
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">New job opening</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        This will be visible to your own learners.
      </p>
      <JobBuilderForm organisations={[]} tier="organisation" />
    </div>
  )
}
