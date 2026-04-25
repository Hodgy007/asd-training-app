import { Megaphone } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Announcements | Guide' }

export default function GuideAnnouncementsPage() {
  return (
    <GuideSubpage
      parentHref="/super-admin/guide"
      parentLabel="Back to Guide"
      icon={Megaphone}
      title="Announcements"
      accent="purple"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Announcements allow you to communicate important information to users across the platform.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating a global announcement</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Navigate to <strong>Announcements</strong> from the sidebar.</li>
        <li>Click <strong>Create Announcement</strong>.</li>
        <li>Enter a title and message body.</li>
        <li>Leave the organisation field empty to make it a <strong>global announcement</strong> visible to all users on the platform.</li>
        <li>Optionally set an <strong>expiry date</strong> &mdash; the announcement will automatically disappear after this date.</li>
        <li>Click <strong>Save</strong> to publish.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating an org-scoped announcement</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Select a specific organisation when creating the announcement. Only users within that organisation will see it.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Setting expiry dates</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Expiry dates are optional. When set, the announcement is automatically hidden after the date passes. Announcements without an expiry remain visible until manually removed.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing and managing announcements</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Click on any announcement to edit its content, change the target audience, or update the expiry date. You can also delete announcements that are no longer needed.
      </p>

      <Tip>Use global announcements sparingly for platform-wide updates. For organisation-specific news, always scope the announcement to the relevant organisation.</Tip>
    </GuideSubpage>
  )
}
