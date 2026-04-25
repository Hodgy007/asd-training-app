import { Users } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Managing Charity Users | Guide' }

export default function GuideUsersPage() {
  return (
    <GuideSubpage
      parentHref="/super-admin/guide"
      parentLabel="Back to Guide"
      icon={Users}
      title="Managing Charity Users"
      accent="purple"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        As a Charity Admin, you can create and manage other Charity Admin and Charity Employee accounts from the <strong>Users</strong> page.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating a new user</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Navigate to <strong>Users</strong> from the sidebar.</li>
        <li>Click <strong>Add User</strong>.</li>
        <li>Enter the user&apos;s name, email, and a temporary password.</li>
        <li>Select the role: <strong>Charity Admin</strong> (full access) or <strong>Charity Employee</strong> (delegated access).</li>
        <li>If Charity Employee, select which permissions to grant (Manage Organisations, Manage Training, Manage Surveys, Manage Announcements, View Reports).</li>
        <li>Click <strong>Create User</strong>. The user will be prompted to change their password on first login.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing a user</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Click the edit button on any user to change their name, role, permissions, or active status. You can also reset their password. Note that you cannot deactivate your own account.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Charity Admin vs Charity Employee</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Charity Admin</strong> &mdash; full platform access including user management. Multiple Charity Admins can exist.</li>
        <li><strong>Charity Employee</strong> &mdash; can only access areas they have been granted permission for. Cannot manage other users.</li>
      </ul>

      <Tip>Use Charity Employee accounts for staff who only need access to specific areas. This follows the principle of least privilege.</Tip>
    </GuideSubpage>
  )
}
