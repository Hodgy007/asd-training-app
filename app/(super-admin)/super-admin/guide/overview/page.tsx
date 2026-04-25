import { LayoutDashboard } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Overview Dashboard | Guide' }

export default function GuideOverviewPage() {
  return (
    <GuideSubpage
      parentHref="/super-admin/guide"
      parentLabel="Back to Guide"
      icon={LayoutDashboard}
      title="Overview Dashboard"
      accent="purple"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Overview page is your landing page after signing in. It provides a high-level snapshot of the entire platform.
      </p>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">What you will see</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Platform-wide statistics at a glance &mdash; total organisations, users, training completion rates, and active surveys.</li>
        <li>Quick-access cards linking to every management area (Organisations, Training Content, Surveys, Announcements, Reports).</li>
        <li>Recent activity feed showing the latest user registrations, training completions, and survey responses across all organisations.</li>
      </ul>
      <Tip>Use the Overview page as your daily starting point to spot trends and quickly navigate to areas that need attention.</Tip>
    </GuideSubpage>
  )
}
