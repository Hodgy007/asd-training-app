'use client'

import { useSession } from 'next-auth/react'
import { User } from 'lucide-react'
import { SettingsSubpage } from '@/components/settings/subpage'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Administrator',
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
  CAREGIVER: 'Practitioner',
}

export default function SettingsAccountPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const roleLabel = (role && ROLE_LABELS[role]) || 'User'

  return (
    <SettingsSubpage
      title="Your Account"
      description="The basic details we hold for your account."
      icon={User}
      iconColor="text-blue-600 dark:text-blue-400"
      iconBg="bg-blue-50 dark:bg-blue-900/20"
    >
      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Name</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{session?.user?.name || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Email</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{session?.user?.email || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Role</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{roleLabel}</p>
          </div>
        </div>
      </div>
    </SettingsSubpage>
  )
}
