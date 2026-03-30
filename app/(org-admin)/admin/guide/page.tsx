import {
  Users, Calendar, Megaphone, BarChart3, Video, Shield,
  Plus, Pencil, Trash2, UserPlus, Mail, Lock,
  Settings, HelpCircle, CheckCircle
} from 'lucide-react'

export default function OrgAdminGuidePage() {
  return (
    <div className="min-h-screen bg-calm-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-2">
            <HelpCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Org Admin Guide
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Everything you need to know about managing your organisation. This guide covers user management,
            sessions, announcements, reports, and configuration settings.
          </p>
        </div>

        {/* 1. User Management */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-calm-200 dark:border-slate-700">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">User Management</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
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
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Practitioner</strong> &mdash; Access to ASD Awareness Training modules and child observation tools.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Career Dev Officer</strong> &mdash; Access to Careers CPD Training modules.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Student / Intern / Employee</strong> &mdash; Access to whichever training plans are assigned by your organisation.</span>
              </li>
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

            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>SSO users must be pre-created.</strong> If your organisation uses Google or Microsoft SSO,
                you must create the user account first with their email address. Only then can the user sign in
                via SSO. The system will not auto-create accounts for unknown emails.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Forced password change.</strong> Users created with the <em>mustChangePassword</em> flag
                will be required to set a new password the next time they log in. This is useful when setting
                temporary passwords for new accounts.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Virtual Classroom Sessions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-calm-200 dark:border-slate-700">
            <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Virtual Classroom Sessions</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
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
              <li>Paste a meeting link manually, or auto-generate one via the Zoom/Teams API if configured (see Meeting Settings below).</li>
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

            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Users see their upcoming sessions on their <strong>Dashboard</strong> and on the dedicated
                <strong> Sessions</strong> page. Both the host and you (as Org Admin) have full management rights.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Announcements */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-calm-200 dark:border-slate-700">
            <Megaphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Announcements</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Announcements let you communicate important information to all users in your organisation.
              They appear prominently on each user&apos;s dashboard.
            </p>

            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating an Announcement</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Go to <strong>Announcements</strong> in the sidebar and click <strong>New Announcement</strong>.</li>
              <li>Enter a title and the announcement body text.</li>
              <li>Optionally set an expiry date &mdash; the announcement will automatically stop showing after this date.</li>
              <li>Save the announcement. It will be visible to all users in your organisation immediately.</li>
            </ol>

            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Managing Announcements</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <Pencil className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>Edit announcements to update their content or extend the expiry date.</span>
              </li>
              <li className="flex items-start gap-2">
                <Trash2 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <span>Delete announcements that are no longer relevant.</span>
              </li>
            </ul>

            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Your announcements are <strong>org-scoped</strong> &mdash; they are only visible to users
                within your organisation. Super Admins can create global announcements that appear for everyone.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Reports */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-calm-200 dark:border-slate-700">
            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reports</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              The Reports page gives you a comprehensive overview of training progress across your
              organisation.
            </p>

            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">What You Can See</h3>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Organisation-level overview</strong> &mdash; high-level completion rates and engagement metrics.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Per-user completion rates</strong> &mdash; see which users have completed their assigned training.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Training plan breakdown</strong> &mdash; progress is grouped by &quot;ASD Awareness Training&quot; and &quot;Careers CPD Training&quot;.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span><strong>Module and lesson statistics</strong> &mdash; drill down into individual module and lesson completion for your org&apos;s users.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 5. Meeting Settings */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-calm-200 dark:border-slate-700">
            <Video className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Meeting Settings</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Configure your organisation&apos;s meeting platform integrations to enable auto-generated
              meeting links when creating virtual classroom sessions.
            </p>

            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Zoom Integration</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Navigate to <strong>Meeting Settings</strong> in the sidebar.</li>
              <li>Enter your Zoom <strong>API Key</strong> and <strong>API Secret</strong> from your Zoom Developer account.</li>
              <li>Save the configuration. You can now auto-generate Zoom links when creating sessions.</li>
            </ol>

            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Microsoft Teams Integration</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>Enter your Microsoft <strong>Tenant ID</strong> and the required credentials from Azure Portal.</li>
              <li>Save the configuration. Teams meeting links can then be generated automatically.</li>
            </ol>

            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                These settings are <strong>per-organisation</strong> and only affect your org&apos;s sessions.
                If you don&apos;t configure meeting APIs, you can still paste meeting links manually when
                creating sessions.
              </p>
            </div>
          </div>
        </div>

        {/* 6. Enterprise SSO */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-calm-200 dark:border-slate-700">
            <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Enterprise SSO</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
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

            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Important:</strong> Unless auto-provisioning is enabled, users must be pre-created in
                the system before they can use SSO. Create their accounts first via the Users page, then they
                can sign in with their identity provider.
              </p>
            </div>
          </div>
        </div>

        {/* 7. Security & MFA */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-emerald-50 dark:bg-emerald-900/20 border-b border-calm-200 dark:border-slate-700">
            <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Security &amp; MFA</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
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

            <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>Do not lose access to your authenticator app.</strong> If you lose your MFA device,
                contact a Super Admin to reset your MFA settings so you can set it up again.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
