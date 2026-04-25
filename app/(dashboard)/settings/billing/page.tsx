'use client'

import { useSession } from 'next-auth/react'
import { CreditCard } from 'lucide-react'
import { SettingsSubpage } from '@/components/settings/subpage'
import { ManageBillingButton } from '@/components/billing/manage-billing-button'

export default function SettingsBillingPage() {
  const { data: session } = useSession()

  if (!session?.user?.isPersonalOrg) {
    return (
      <SettingsSubpage
        title="Billing"
        icon={CreditCard}
        iconColor="text-emerald-600 dark:text-emerald-400"
        iconBg="bg-emerald-50 dark:bg-emerald-900/20"
      >
        <div className="card">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Billing is managed by your organisation.
          </p>
        </div>
      </SettingsSubpage>
    )
  }

  return (
    <SettingsSubpage
      title="Billing"
      description="Manage your subscription and payment method."
      icon={CreditCard}
      iconColor="text-emerald-600 dark:text-emerald-400"
      iconBg="bg-emerald-50 dark:bg-emerald-900/20"
    >
      <div className="card space-y-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Subscription status:{' '}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {session.user.subscriptionStatus ?? 'NONE'}
          </span>
        </p>
        <ManageBillingButton />
      </div>
    </SettingsSubpage>
  )
}
