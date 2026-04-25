import { Settings, UserPlus, Users, Mail } from 'lucide-react'
import { Tip } from '@/components/howto/panel'

export default function SsoHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Configure SAML-based Single Sign-On so your organisation&apos;s users can sign in with their
        existing identity provider.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Required Configuration</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Navigate to <strong>Enterprise SSO</strong> in the sidebar.</li>
        <li>Enter the <strong>SSO URL</strong> (your identity provider&apos;s login endpoint).</li>
        <li>Enter the <strong>Entity ID</strong> (the unique identifier for your IdP).</li>
        <li>Paste the <strong>Certificate</strong> provided by your identity provider.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Optional Settings</h3>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-start gap-2">
          <Settings className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span><strong>Metadata URL</strong> &mdash; auto-configure from your IdP&apos;s metadata endpoint.</span>
        </li>
        <li className="flex items-start gap-2">
          <UserPlus className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span><strong>Auto-provisioning</strong> &mdash; automatically create user accounts when they sign in via SSO for the first time.</span>
        </li>
        <li className="flex items-start gap-2">
          <Users className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span><strong>Default role</strong> &mdash; the role assigned to auto-provisioned users.</span>
        </li>
        <li className="flex items-start gap-2">
          <Mail className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span><strong>Email domain</strong> &mdash; restrict SSO to users with a matching email domain.</span>
        </li>
      </ul>

      <Tip>
        <strong>Important:</strong> Unless auto-provisioning is enabled, users must be pre-created in
        the system before they can use SSO. Create their accounts first via the Users page, then they
        can sign in with their identity provider.
      </Tip>
    </>
  )
}
