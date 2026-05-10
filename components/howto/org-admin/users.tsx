import { Pencil, Lock, Trash2 } from 'lucide-react'
import { Tip } from '@/components/howto/panel'

export default function UsersHowTo() {
  return (
    <>
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
        <strong>Sign-up routes vary by provider.</strong> If your organisation uses <em>SAML SSO</em> (Enterprise SSO),
        users still need to be pre-created here unless your SSO config has auto-provisioning enabled.
        If your platform has <em>Google or Microsoft OAuth</em> turned on by the charity, a first-time user
        with an unknown email will be routed through a one-question self-registration page instead of
        being rejected.
      </Tip>

      <Tip>
        <strong>Self-registration via magic link.</strong> Users who register themselves at <em>/register</em>
        and join your organisation no longer choose a password during sign-up. They receive a welcome
        email and pick their password the first time they sign in. You&apos;ll see them appear in the
        Users list as soon as they complete the welcome step.
      </Tip>

      <Tip>
        <strong>Forced password change.</strong> Users created with the <em>mustChangePassword</em> flag
        will be required to set a new password the next time they log in. This is useful when setting
        temporary passwords for new accounts.
      </Tip>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Security &amp; MFA</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        As an Org Admin, multi-factor authentication (MFA) is mandatory for your account. This ensures
        your admin access is protected by an additional layer of security.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Setting Up MFA</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>On your first login, you will be redirected to the MFA setup page.</li>
        <li>Open an authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.).</li>
        <li>Scan the QR code displayed on screen with your authenticator app.</li>
        <li>Enter the 6-digit code from your authenticator app to confirm setup.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Logging In with MFA</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Enter your email and password as usual.</li>
        <li>You will be prompted for your 6-digit TOTP code from your authenticator app.</li>
        <li>Enter the code to complete sign-in. This is required every time you log in.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Password Management</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        If you are not using SSO, you can change your password via the Settings page. If you forget
        your password, use the &quot;Forgot password&quot; link on the login page to receive a reset
        email.
      </p>

      <Tip>
        <strong>Do not lose access to your authenticator app.</strong> If you lose your MFA device,
        contact a Super Admin to reset your MFA settings so you can set it up again.
      </Tip>
    </>
  )
}
