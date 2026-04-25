import { Shield, Crown, Users } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'User & Access Management | Guide' }

export default function GuideAccessPage() {
  return (
    <GuideSubpage
      parentHref="/super-admin/guide"
      parentLabel="Back to Guide"
      icon={Shield}
      title="User & Access Management"
      accent="purple"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Understanding the role hierarchy and access controls is essential for managing the platform securely.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Roles explained</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Charity Admin</strong> <Crown className="inline h-3.5 w-3.5 text-purple-500" /> &mdash; full platform access including user management. Manages organisations, training content, surveys, announcements, and reports across the entire platform.</li>
        <li><strong>Charity Employee</strong> <Shield className="inline h-3.5 w-3.5 text-blue-500" /> &mdash; delegated platform access with specific permissions granted by a Charity Admin. Can manage organisations, training, surveys, announcements, and/or reports depending on assigned permissions.</li>
        <li><strong>Org Admin</strong> <Users className="inline h-3.5 w-3.5 text-blue-500" /> &mdash; manages users, announcements, sessions, and reports within their own organisation.</li>
        <li><strong>Practitioner</strong> (Caregiver) &mdash; accesses ASD training modules and training reports.</li>
        <li><strong>Careers Professional</strong> (Career Dev Officer) &mdash; accesses careers CPD training, CV Builder, Careers Advisor, Jobs, and manages their students.</li>
        <li><strong>Student</strong> / <strong>Intern</strong> / <strong>Employee</strong> &mdash; access training modules assigned to their organisation, plus CV Builder, Careers Advisor, and Jobs.</li>
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
        Single Sign-On is configured at the application level (not per-organisation). Both Google OAuth and Microsoft Azure AD are supported.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Configure the OAuth provider in the respective cloud console (Google Cloud Console or Azure Portal).</li>
        <li>Set the redirect URIs to the appropriate callback URLs for the platform.</li>
        <li>Add the client ID, client secret, and tenant ID (Azure only) to the platform environment variables.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pre-creating users for SSO</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        SSO login requires that user accounts already exist in the platform. Users who attempt to sign in via SSO without a pre-existing account will be rejected. Org Admins must create the user account first (with the matching email address), after which the user can sign in via Google or Microsoft.
      </p>

      <Tip>Always ensure Org Admins have MFA configured before granting them access. The platform enforces this automatically, but it is good practice to communicate the requirement during onboarding.</Tip>
    </GuideSubpage>
  )
}
