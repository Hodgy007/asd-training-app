import { Lock } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Security & MFA | Guide' }

export default function GuideSecurityPage() {
  return (
    <GuideSubpage
      parentHref="/admin/guide"
      parentLabel="Back to Guide"
      icon={Lock}
      title="Security & MFA"
      accent="emerald"
    >
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
    </GuideSubpage>
  )
}
