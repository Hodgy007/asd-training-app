import { Settings } from 'lucide-react'
import { GuideSubpage } from '@/components/guide/subpage'

export const metadata = { title: 'Settings | Guide' }

export default function GuideSettingsPage() {
  return (
    <GuideSubpage
      parentHref="/guide"
      parentLabel="Back to Guide"
      icon={Settings}
      title="Settings"
      accent="primary"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Manage your account preferences and security from the Settings page.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Change your password (if you logged in with email/password, not SSO)</li>
        <li>View your account details</li>
        <li>Your role and organisation are displayed here</li>
      </ol>
    </GuideSubpage>
  )
}
