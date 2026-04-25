import { LayoutDashboard } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Dashboard | Guide' }

export default function GuideDashboardPage() {
  return (
    <GuideSubpage
      parentHref="/guide"
      parentLabel="Back to Guide"
      icon={LayoutDashboard}
      title="Dashboard"
      accent="primary"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Your dashboard shows a personalised overview of your activity and what needs your attention.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Announcements from your organisation appear at the top of the page</li>
        <li>Upcoming virtual workshops are displayed so you never miss one</li>
        <li>Pending surveys (if any) appear as cards — click to complete them inline</li>
        <li>Training progress statistics show your completion rate across all assigned modules</li>
        <li>Use the sidebar to quickly access all features available to your role</li>
      </ol>
      <Tip>Check your dashboard regularly for new announcements and upcoming workshops.</Tip>
    </GuideSubpage>
  )
}
