import { Pencil, Trash2 } from 'lucide-react'
import { Tip } from '@/components/howto/panel'

export default function AnnouncementsHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Announcements let you communicate important information to all users in your organisation.
        They appear prominently on each user&apos;s dashboard.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating an Announcement</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Go to <strong>Announcements</strong> in the sidebar and click <strong>New Announcement</strong>.</li>
        <li>Enter a title and the announcement body text.</li>
        <li>Optionally set an expiry date &mdash; the announcement will automatically stop showing after this date.</li>
        <li>Save the announcement. It will be visible to all users in your organisation immediately.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Managing Announcements</h3>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-start gap-2">
          <Pencil className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>Edit announcements to update their content or extend the expiry date.</span>
        </li>
        <li className="flex items-start gap-2">
          <Trash2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>Delete announcements that are no longer relevant.</span>
        </li>
      </ul>

      <Tip>
        Your announcements are <strong>org-scoped</strong> &mdash; they are only visible to users
        within your organisation. Super Admins can create global announcements that appear for everyone.
      </Tip>
    </>
  )
}
