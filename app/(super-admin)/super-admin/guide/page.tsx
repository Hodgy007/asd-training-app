import {
  LayoutDashboard,
  Building2,
  BookOpen,
  ClipboardList,
  Megaphone,
  BarChart3,
  Shield,
  Users,
  Sparkles,
  FileText,
  Upload,
  Eye,
  Send,
  XCircle,
  Pencil,
  Trash2,
  Crown,
  Settings,
  HelpCircle,
  Plug,
} from 'lucide-react'

export const metadata = {
  title: 'How to Guide | Super Admin',
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 bg-purple-50 dark:bg-purple-900/20 border-b border-calm-200 dark:border-slate-700">
        <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">
        {children}
      </div>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
      <p className="text-sm text-amber-800 dark:text-amber-300">{children}</p>
    </div>
  )
}

export default function SuperAdminGuidePage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <HelpCircle className="h-7 w-7 text-purple-500" />
          How to Guide
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          A comprehensive reference for managing the platform as a Charity Admin. Each section below covers a key area of the admin panel with step-by-step instructions.
        </p>
      </div>

      {/* 1. Overview Dashboard */}
      <SectionCard icon={LayoutDashboard} title="Overview Dashboard">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The Overview page is your landing page after signing in. It provides a high-level snapshot of the entire platform.
        </p>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">What you will see</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Platform-wide statistics at a glance &mdash; total organisations, users, training completion rates, and active surveys.</li>
          <li>Quick-access cards linking to every management area (Organisations, Training Content, Surveys, Announcements, Reports).</li>
          <li>Recent activity feed showing the latest user registrations, training completions, and survey responses across all organisations.</li>
        </ul>
        <Tip>Use the Overview page as your daily starting point to spot trends and quickly navigate to areas that need attention.</Tip>
      </SectionCard>

      {/* 2. Managing Charity Users */}
      <SectionCard icon={Users} title="Managing Charity Users">
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
      </SectionCard>

      {/* 3. Managing Organisations */}
      <SectionCard icon={Building2} title="Managing Organisations">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Organisations are the top-level tenants on the platform. Each organisation has its own users, training access, and configuration.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating a new organisation</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Navigate to <strong>Organisations</strong> from the sidebar.</li>
          <li>Click the <strong>Create Organisation</strong> button.</li>
          <li>Enter the organisation name and a unique slug (used in URLs).</li>
          <li>Select the allowed training programs &mdash; <strong>ASD Awareness Training</strong> and/or <strong>Careers CPD Training</strong>.</li>
          <li>Configure the allowed roles that can be assigned to users within this organisation.</li>
          <li>Click <strong>Save</strong> to create the organisation.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Setting up training programs</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Each organisation can be granted access to one or both training programs. These are presented as simple toggles:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>ASD Awareness Training</strong> &mdash; covers modules 1 through 5 of the ASD awareness curriculum.</li>
          <li><strong>Careers CPD Training</strong> &mdash; covers modules 1 through 4 of the careers continuing professional development curriculum.</li>
        </ul>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Configuring allowed roles</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Control which user roles can be created within each organisation. For example, you might restrict a specialist organisation to only Practitioner and Student roles.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing and deactivating organisations</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Click on an organisation row to open its settings.</li>
          <li>Update any field (name, slug, training programs, roles) and click <strong>Save</strong>.</li>
          <li>To deactivate an organisation, toggle the <strong>Active</strong> switch off. Deactivated organisations&apos; users will be blocked from signing in.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Viewing organisation users</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          From the organisation detail view, you can see all users belonging to that organisation along with their roles and activity status.
        </p>

        <Tip>Deactivating an organisation immediately prevents all its users from logging in. Use this for offboarding or temporarily suspending access.</Tip>
      </SectionCard>

      {/* 3. Training Content Management */}
      <SectionCard icon={BookOpen} title="Training Content Management">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Manage all training programs, modules, lessons, and quizzes from the <strong>Training Content</strong> page.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Viewing existing programs</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The Training Content page lists all programs with their modules and current status. Use the <strong>View</strong> button to preview content as a learner (opens in a new tab) or the <strong>Edit</strong> button to modify content.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating training programs manually</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Click <strong>Create Program</strong> and enter a title, description, and program type (ASD or Careers).</li>
          <li>Add modules to the program, each with a title and description.</li>
          <li>Within each module, add lessons using the WYSIWYG rich-text editor.</li>
          <li>Add quiz questions to each lesson &mdash; either manually or using AI generation.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          <span className="inline-flex items-center gap-1.5"><Upload className="h-4 w-4 text-purple-500" /> Import from Files</span>
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Upload PDF, DOCX, or PPTX files to auto-generate training content using AI. The platform analyses your existing material and organises it into modules, lessons, and quizzes while preserving the original wording as closely as possible. This is ideal for digitising existing training documents.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Click <strong>Import from Files</strong> on the Training Content page.</li>
          <li>Upload one or more files (PDF, DOCX, or PPTX).</li>
          <li>Review the AI-generated structure and make any adjustments.</li>
          <li>Save to create the program, modules, lessons, and quizzes.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-purple-500" /> Generate from Files</span>
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Upload files and let AI create entirely new, pedagogically-designed training content inspired by your material. Unlike Import, this generates fresh content rather than preserving original wording &mdash; ideal when you want to use source material as a foundation for new courses.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing modules and lessons</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Click <strong>Edit</strong> on any module or lesson to open the WYSIWYG editor. The editor supports rich text formatting, headings, lists, images, and more. After saving, you are redirected back to the module page.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Managing quiz questions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Within any lesson, scroll to the <strong>Quiz Questions</strong> section.</li>
          <li>Click <strong>Add Question</strong> to create one manually, entering the question text, answer options, and correct answer.</li>
          <li>Alternatively, click <strong>Generate with AI</strong> to have Gemini create quiz questions based on the lesson content.</li>
          <li>Review and edit any AI-generated questions before saving.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Previewing content as a learner</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Click the <strong>View</strong> button on any program or module to open it in a new tab. This renders the content exactly as a learner would see it, allowing you to verify formatting, quiz flow, and overall experience.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Program status workflow</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Programs follow a four-stage lifecycle:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Draft</strong> &mdash; initial creation and editing. Not visible to learners.</li>
          <li><strong>Under Review</strong> &mdash; content is being reviewed before approval.</li>
          <li><strong>Approved</strong> &mdash; published and visible to learners with appropriate access.</li>
          <li><strong>Archived</strong> &mdash; removed from active use but preserved for reference.</li>
        </ol>

        <Tip>Use &ldquo;Import from Files&rdquo; when you want to preserve your existing training material as-is. Use &ldquo;Generate from Files&rdquo; when you want AI to create new, pedagogically-structured content inspired by your source documents.</Tip>
      </SectionCard>

      {/* 4. Survey Management */}
      <SectionCard icon={ClipboardList} title="Survey Management">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Create and manage surveys to collect feedback from users across the platform.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating a survey manually</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Navigate to <strong>Surveys</strong> from the sidebar and click <strong>Create Survey</strong>.</li>
          <li>Enter a survey title and optional description.</li>
          <li>Add questions using the survey builder. Five question types are available:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
              <li><strong>Multiple Choice</strong> &mdash; single selection from a list of options.</li>
              <li><strong>Yes/No</strong> &mdash; simple binary question.</li>
              <li><strong>Free Text</strong> &mdash; open-ended text response.</li>
              <li><strong>Rating Scale (1&ndash;5)</strong> &mdash; numeric rating.</li>
              <li><strong>Multi Select</strong> &mdash; multiple selections from a list of options.</li>
            </ul>
          </li>
          <li>Reorder questions by dragging or using the move buttons.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-purple-500" /> AI Survey Generation</span>
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Generate complete surveys automatically by providing a topic description or uploading files. AI will create relevant questions using an appropriate mix of question types.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Setting up the target audience</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Use the role x organisation picker to define exactly who should receive the survey. You can target specific roles within specific organisations, all roles in certain organisations, or all users platform-wide.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Adding a close date</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Optionally set a close date. After this date, the survey will automatically stop accepting responses.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Publishing and closing surveys</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Publishing</strong> <Send className="inline h-3.5 w-3.5 text-slate-400" /> &mdash; makes the survey visible to the targeted users. Users will see it in their dashboard.</li>
          <li><strong>Closing</strong> <XCircle className="inline h-3.5 w-3.5 text-slate-400" /> &mdash; stops the survey from accepting new responses. Existing responses are preserved.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Viewing survey details and results</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Click <strong>View</strong> <Eye className="inline h-3.5 w-3.5 text-slate-400" /> on any survey to see its questions and configuration.</li>
          <li>Click <strong>Results</strong> to see charts and response breakdowns for each question.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-purple-500" /> Generating AI Insights</span>
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          From the results page, generate AI-powered insights to help interpret the data:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Summary</strong> &mdash; an overall summary of key findings and themes.</li>
          <li><strong>Comparative</strong> &mdash; cross-role and cross-organisation analysis highlighting differences and patterns.</li>
          <li><strong>Recommendations</strong> &mdash; actionable recommendations based on the survey responses.</li>
        </ul>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Deleting a survey</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Click the <strong>Delete</strong> <Trash2 className="inline h-3.5 w-3.5 text-slate-400" /> button on a survey to permanently remove it and all its responses. This action cannot be undone.
        </p>

        <Tip>Publish a survey only after you have finalised all questions and configured the target audience. Once published, questions cannot be edited to ensure response consistency.</Tip>
      </SectionCard>

      {/* 5. Announcements */}
      <SectionCard icon={Megaphone} title="Announcements">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Announcements allow you to communicate important information to users across the platform.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating a global announcement</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Navigate to <strong>Announcements</strong> from the sidebar.</li>
          <li>Click <strong>Create Announcement</strong>.</li>
          <li>Enter a title and message body.</li>
          <li>Leave the organisation field empty to make it a <strong>global announcement</strong> visible to all users on the platform.</li>
          <li>Optionally set an <strong>expiry date</strong> &mdash; the announcement will automatically disappear after this date.</li>
          <li>Click <strong>Save</strong> to publish.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating an org-scoped announcement</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Select a specific organisation when creating the announcement. Only users within that organisation will see it.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Setting expiry dates</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Expiry dates are optional. When set, the announcement is automatically hidden after the date passes. Announcements without an expiry remain visible until manually removed.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing and managing announcements</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Click on any announcement to edit its content, change the target audience, or update the expiry date. You can also delete announcements that are no longer needed.
        </p>

        <Tip>Use global announcements sparingly for platform-wide updates. For organisation-specific news, always scope the announcement to the relevant organisation.</Tip>
      </SectionCard>

      {/* 6. Reports */}
      <SectionCard icon={BarChart3} title="Reports">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The Reports page provides platform-wide insights into training progress and engagement.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Platform-wide training progress</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          View aggregate statistics across all organisations, including total lessons completed, average completion rates, and active learner counts.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Per-organisation completion rates</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Break down training progress by organisation to identify which groups are progressing well and which may need additional support or encouragement.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Module and lesson completion statistics</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Drill down into individual modules and lessons to see completion counts. Reports display proper module names and training plan labels (&ldquo;ASD Awareness Training&rdquo;, &ldquo;Careers CPD Training&rdquo;) rather than raw identifiers.
        </p>

        <Tip>Check reports regularly to identify organisations with low engagement. Consider reaching out to their Org Admins or creating targeted announcements to boost participation.</Tip>
      </SectionCard>

      {/* 7. User & Access Management */}
      <SectionCard icon={Shield} title="User & Access Management">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Understanding the role hierarchy and access controls is essential for managing the platform securely.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Roles explained</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Charity Admin</strong> <Crown className="inline h-3.5 w-3.5 text-purple-500" /> &mdash; full platform access including user management. Manages organisations, training content, surveys, announcements, and reports across the entire platform.</li>
          <li><strong>Charity Employee</strong> <Shield className="inline h-3.5 w-3.5 text-blue-500" /> &mdash; delegated platform access with specific permissions granted by a Charity Admin. Can manage organisations, training, surveys, announcements, and/or reports depending on assigned permissions.</li>
          <li><strong>Org Admin</strong> <Users className="inline h-3.5 w-3.5 text-blue-500" /> &mdash; manages users, announcements, sessions, and reports within their own organisation.</li>
          <li><strong>Practitioner</strong> (Caregiver) &mdash; accesses ASD training, child observations, and reports.</li>
          <li><strong>Career Dev Officer</strong> &mdash; accesses careers CPD training.</li>
          <li><strong>Student</strong> &mdash; accesses training modules assigned to their organisation.</li>
          <li><strong>Intern</strong> &mdash; accesses training modules assigned to their organisation.</li>
          <li><strong>Employee</strong> &mdash; accesses training modules assigned to their organisation.</li>
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
      </SectionCard>

      {/* 8. Integrations */}
      <SectionCard icon={Plug} title="Integrations (Power Automate / Dynamics 365)">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The platform provides a reporting API that external tools like Microsoft Power Automate or Dynamics 365 can connect to. This allows you to automatically sync training, survey, and document library data into your existing Microsoft ecosystem.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">How it works</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Navigate to <strong>Integrations</strong> from the sidebar (Charity Admin only).</li>
          <li>Create an <strong>API Key</strong> &mdash; give it a name and optionally set an expiry date.</li>
          <li>Copy the generated key immediately (it is shown only once and cannot be retrieved again).</li>
          <li>Use the key in Power Automate or any HTTP-capable tool as a <strong>Bearer token</strong> in the Authorization header.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">API Endpoint</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          The reports API is available at <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">/api/integrations/reports</code>. It returns JSON data covering three sections:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Training</strong> (<code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">?section=training</code>) &mdash; completion rates by organisation and module.</li>
          <li><strong>Surveys</strong> (<code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">?section=surveys</code>) &mdash; all survey responses with individual answers.</li>
          <li><strong>Library</strong> (<code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">?section=library</code>) &mdash; document download counts by collection.</li>
          <li>Omit the parameter to get all three sections in one call.</li>
        </ul>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Connecting Power Automate to Dynamics 365</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li>Create a <strong>Scheduled cloud flow</strong> in Power Automate (e.g. run weekly).</li>
          <li>Add an <strong>HTTP</strong> action: <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">GET</code> to the reports URL with your API key as <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">Authorization: Bearer &lt;key&gt;</code>.</li>
          <li>Add a <strong>Parse JSON</strong> action to extract the response data.</li>
          <li>Use <strong>Apply to each</strong> to loop through the training/survey/library arrays.</li>
          <li>Add a <strong>Dataverse &mdash; Add a new row</strong> action to create records in your Dynamics 365 tables.</li>
          <li>Map JSON fields (e.g. <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">organisationName</code>, <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-xs">completionRate</code>) to Dynamics columns.</li>
        </ol>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Alternative destinations</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Instead of Dynamics, you can route data to SharePoint lists, Excel Online spreadsheets, Microsoft Teams notifications, or any service available in Power Automate.
        </p>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Managing API keys</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li><strong>Last Used</strong> &mdash; shows when the key was last used, so you can identify unused keys.</li>
          <li><strong>Expiry</strong> &mdash; set an expiry date for keys that should only work for a limited period.</li>
          <li><strong>Revoke</strong> &mdash; delete a key immediately if it is compromised or no longer needed.</li>
        </ul>

        <Tip>Create separate API keys for different integrations (e.g. one for Power Automate, one for a BI tool). This way you can revoke one without affecting others.</Tip>
      </SectionCard>
    </div>
  )
}
