import { Shield } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Charity Employee Permissions | Guide' }

export default function GuideCharityEmployeesPage() {
  return (
    <GuideSubpage
      parentHref="/super-admin/guide"
      parentLabel="Back to Guide"
      icon={Shield}
      title="Delegating access to Charity Employees"
      accent="purple"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        <strong>Charity Employee</strong> accounts let you delegate parts of the Charity Admin job without handing over the full keys. Each Charity Employee has a <strong>permissions</strong> array &mdash; the sidebar and APIs dynamically show only the areas their permissions cover.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">The nine permissions</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Manage Organisations</strong> &mdash; create, edit, activate/deactivate organisations and their admins.</li>
        <li><strong>Manage Training</strong> &mdash; create and edit training programs, modules, lessons, and quiz questions.</li>
        <li><strong>Manage Surveys</strong> &mdash; create surveys, manage lifecycle, and generate insights.</li>
        <li><strong>Manage Announcements</strong> &mdash; post and schedule charity-wide or org-scoped announcements.</li>
        <li><strong>View Reports</strong> &mdash; see platform-wide training, library, and survey reports.</li>
        <li><strong>Manage Workshops</strong> &mdash; create and run charity-level virtual workshops.</li>
        <li><strong>Manage Library</strong> &mdash; create collections, upload documents, and set visibility.</li>
        <li><strong>Manage AI Prompts</strong> &mdash; edit prompts in the AI registry that power the platform&apos;s AI features.</li>
        <li><strong>Manage Job Openings</strong> &mdash; create, publish, and manage jobs shown to learners.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Assigning permissions</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Create a user from the <strong>Users</strong> page with role <em>Charity Employee</em>.</li>
        <li>Tick each permission you want to grant. Charity Admins always have all permissions implicitly.</li>
        <li>Save. The user&apos;s sidebar will only include the sections they can manage.</li>
      </ol>

      <Tip>Grant the minimum set of permissions needed. You can always add more later.</Tip>
    </GuideSubpage>
  )
}
