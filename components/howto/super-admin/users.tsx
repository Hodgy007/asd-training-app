import { Shield, Crown, Users } from 'lucide-react'
import { Tip } from '@/components/howto/panel'

export default function UsersHowTo() {
  return (
    <>
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

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">User &amp; Access Management</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Understanding the role hierarchy and access controls is essential for managing the platform securely.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Roles explained</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Charity Admin</strong> <Crown className="inline h-3.5 w-3.5 text-primary-500" /> &mdash; full platform access including user management. Manages organisations, training content, surveys, announcements, and reports across the entire platform.</li>
        <li><strong>Charity Employee</strong> <Shield className="inline h-3.5 w-3.5 text-blue-500" /> &mdash; delegated platform access with specific permissions granted by a Charity Admin. Can manage organisations, training, surveys, announcements, and/or reports depending on assigned permissions.</li>
        <li><strong>Org Admin</strong> <Users className="inline h-3.5 w-3.5 text-blue-500" /> &mdash; manages users, announcements, sessions, and reports within their own organisation.</li>
        <li><strong>Learner</strong> &mdash; anyone who takes training, whether internal charity staff or a member of an external organisation. What a learner sees comes from the training programmes their organisation has been assigned, not from their role, so there is no longer a separate role per audience. Learners also get Jobs and the document library.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">MFA / TOTP requirement</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Multi-factor authentication (TOTP) is <strong>mandatory</strong> for Charity Admin, Charity Employee, and Org Admin roles. Admin users without MFA configured will be redirected to the MFA setup page and cannot access any other part of the platform until it is enabled.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">How users are managed</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Day-to-day user management is handled by Org Admins within their respective organisations. As a Super Admin, you can view users within any organisation from the Organisations page but should delegate routine user administration to Org Admins.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">SSO setup (Google OAuth &amp; Azure AD)</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        OAuth Single Sign-On is configured at the platform level. Both Google and Microsoft Azure AD are supported, and each can be turned on or off independently from the <strong>Settings → SSO</strong> page.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Configure the OAuth provider in the respective cloud console (Google Cloud Console or Azure Portal).</li>
        <li>Set the redirect URIs to the platform callback URLs (\`/api/auth/callback/google\` and \`/api/auth/callback/azure-ad\`).</li>
        <li>Add the client ID, client secret, and tenant ID (Azure only) to the platform environment variables on Vercel.</li>
        <li>Open <strong>Settings → SSO</strong>, scroll to the <strong>OAuth Sign-in Providers</strong> card, and flip the toggle for the provider you want to enable. If credentials are missing, the toggle is locked off and an amber warning lists the env vars that still need setting.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">First-time OAuth users</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Users who sign in via Google or Microsoft with an email that&apos;s not in the platform are now routed to a one-question self-registration page (<em>/register/sso-complete</em>). They pick the role that best describes them and finish sign-up automatically under the public user pool. No pre-creation needed for OAuth — only for SAML SSO if auto-provisioning is off.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Self-registration via magic link</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Learners can register at <em>/register</em> without pre-approval. The existing-org and no-org paths skip the password field and email a welcome link instead; recipients click through, choose a password, and sign in. The new-org path is for someone registering their own organisation and still asks for a password during sign-up.
      </p>

      <Tip>Always ensure Org Admins have MFA configured before granting them access. The platform enforces this automatically, but it is good practice to communicate the requirement during onboarding.</Tip>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Delegating access to Charity Employees</h3>
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
    </>
  )
}
