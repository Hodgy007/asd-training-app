import { Calendar, CheckCircle } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Virtual Classroom Sessions | Guide' }

export default function GuideSessionsPage() {
  return (
    <GuideSubpage
      parentHref="/admin/guide"
      parentLabel="Back to Guide"
      icon={Calendar}
      title="Virtual Classroom Sessions"
      accent="emerald"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Create and manage virtual classroom sessions for your organisation&apos;s users. Sessions can be
        hosted on Zoom, Microsoft Teams, or a custom platform.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating a Session</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Navigate to <strong>Sessions</strong> in the sidebar and click <strong>New Session</strong>.</li>
        <li>Enter a title, date and time, duration, and select the platform (Zoom, Teams, or Custom).</li>
        <li>Choose a host from any user in your organisation.</li>
        <li>Add attendees by selecting <strong>all org members</strong>, <strong>specific roles</strong>, or <strong>individual users</strong>.</li>
        <li>Paste a meeting link manually, or auto-generate one via the Zoom/Teams API if configured (see Meeting Settings).</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Session Status Flow</h3>
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Scheduled</span>
        <span className="text-slate-400">&rarr;</span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">In Progress</span>
        <span className="text-slate-400">&rarr;</span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Completed</span>
        <span className="text-slate-400 mx-1">or</span>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Cancelled</span>
      </div>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">After the Session</h3>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <span>Mark attendance using the checkboxes next to each attendee&apos;s name.</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <span>Add a recording URL so attendees who missed the session can catch up.</span>
        </li>
      </ul>

      <Tip>
        Users see their upcoming sessions on their <strong>Dashboard</strong> and on the dedicated
        <strong> Sessions</strong> page. Both the host and you (as Org Admin) have full management rights.
      </Tip>
    </GuideSubpage>
  )
}
