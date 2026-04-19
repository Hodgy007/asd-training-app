import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageJobs } from '@/lib/rbac'
import { JobBuilderForm } from '@/components/jobs/job-builder-form'

export const dynamic = 'force-dynamic'

export default async function NewJobPage() {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) redirect('/super-admin')
  const organisations = await prisma.organisation.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">New job opening</h1>
      <JobBuilderForm organisations={organisations} />
    </div>
  )
}
