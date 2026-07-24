import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { ProvisionOrgWizard } from '@/components/super-admin/provision-org-wizard'

export const dynamic = 'force-dynamic'

export default async function ProvisionOrganisationPage() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    redirect('/super-admin')
  }

  // Only approved, active programmes can sensibly be assigned to a new org.
  const programs = await prisma.trainingProgram.findMany({
    where: { active: true, status: 'APPROVED' },
    select: { id: true, name: true },
    orderBy: { order: 'asc' },
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add an organisation</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Set up a school, college or company, assign its training, and invite its administrator.
        </p>
      </div>
      <ProvisionOrgWizard programs={programs} />
    </div>
  )
}
