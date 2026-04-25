import { Users, Pencil, Lock, Trash2 } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'User Management | Guide' }

export default function GuideUsersPage() {
  return (
    <GuideSubpage
      parentHref="/admin/guide"
      parentLabel="Back to Guide"
      icon={Users}
      title="User Management"
      accent="emerald"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The <strong>Users</strong> page is your home page as an Org Admin. From here you can create,
        edit, and manage all users within your organisation.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating New Users</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click the <strong>Add User</strong> button on the Users page.</li>
        <li>Enter the user&apos;s name, email address, and a temporary password.</li>
        <li>Select the appropriate role for the user.</li>
        <li>The available roles depend on what your Super Admin has configured for your organisation.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Role Descriptions</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Practitioner</strong> &mdash; Access to ASD Awareness Training modules.</li>
        <li><strong>Career Dev Officer</strong> &mdash; Access to Careers CPD Training modules.</li>
        <li><strong>Student / Intern / Employee</strong> &mdash; Access to whichever training plans are assigned by your organisation.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Managing Existing Users</h3>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-start gap-2">
          <Pencil className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>Edit user details (name, email, role) by clicking the edit button on any user row.</span>
        </li>
        <li className="flex items-start gap-2">
          <Lock className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>Reset a user&apos;s password if they are locked out or need a fresh start.</span>
        </li>
        <li className="flex items-start gap-2">
          <Trash2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>Deactivate users who no longer need access. You can reactivate them later if needed.</span>
        </li>
      </ul>

      <Tip>
        <strong>SSO users must be pre-created.</strong> If your organisation uses Google or Microsoft SSO,
        you must create the user account first with their email address. Only then can the user sign in
        via SSO. The system will not auto-create accounts for unknown emails.
      </Tip>

      <Tip>
        <strong>Forced password change.</strong> Users created with the <em>mustChangePassword</em> flag
        will be required to set a new password the next time they log in. This is useful when setting
        temporary passwords for new accounts.
      </Tip>
    </GuideSubpage>
  )
}
