import { Settings, Video, Lock } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Settings | Guide' }

export default function GuideSettingsPage() {
  return (
    <GuideSubpage
      parentHref="/super-admin/guide"
      parentLabel="Back to Guide"
      icon={Settings}
      title="Settings"
      accent="purple"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Platform-wide configuration is managed from the <strong>Settings</strong> page. This includes meeting platform integration and SAML SSO configuration.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        <span className="inline-flex items-center gap-1.5"><Video className="h-4 w-4 text-purple-500" /> Meeting Platform Integration</span>
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Configure a meeting platform (Zoom or Microsoft Teams) to enable auto-generated meeting links for virtual classroom sessions.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Navigate to <strong>Settings &rarr; Meetings</strong> from the sidebar.</li>
        <li>Select the meeting platform (<strong>Zoom</strong> or <strong>Teams</strong>).</li>
        <li>Enter the required API credentials (Client ID, Client Secret, and Account/Tenant ID).</li>
        <li>Click <strong>Test Connection</strong> to verify the credentials work.</li>
        <li>Click <strong>Save</strong> to store the configuration.</li>
      </ol>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Once configured, Org Admins can auto-generate meeting links when creating virtual classroom sessions.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        <span className="inline-flex items-center gap-1.5"><Lock className="h-4 w-4 text-purple-500" /> SAML SSO Configuration</span>
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Configure SAML-based Single Sign-On for Charity Admin and Charity Employee users. This allows your team to log in using your organisation&apos;s identity provider (e.g. Azure AD, Okta, Google Workspace).
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>In the SAML SSO section, enter a <strong>Display Name</strong> for your SSO provider (shown on the login page).</li>
        <li>Paste the <strong>Metadata URL</strong> from your identity provider and click <strong>Parse Metadata</strong> to auto-populate the Entity ID, SSO URL, and certificate.</li>
        <li>Alternatively, enter the <strong>Entity ID</strong>, <strong>SSO URL</strong>, and <strong>X.509 Certificate</strong> manually.</li>
        <li>Toggle <strong>Enforce for Charity Users</strong> to require SSO for all Charity Admin and Charity Employee logins.</li>
        <li>Click <strong>Test Connection</strong> to verify the configuration.</li>
        <li>Click <strong>Save</strong> to enable SAML SSO.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Configuring your identity provider</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        When setting up the application in your identity provider, you will need the platform&apos;s <strong>ACS (Assertion Consumer Service) URL</strong> and <strong>Entity ID</strong>. These are displayed on the Settings page for easy copying.
      </p>

      <Tip>Test the SAML connection before enforcing SSO. If enforcement is enabled and the configuration is incorrect, Charity Admin users may be locked out. You can always disable enforcement by signing in with email and password if needed.</Tip>
    </GuideSubpage>
  )
}
