import { Tip } from '@/components/howto/panel'

export default function OrganisationsHowTo() {
  return (
    <>
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
        Control which user roles can be created within each organisation. In practice this is Learner for members and Org Admin for whoever runs it, since what a learner can see is decided by the organisation&apos;s assigned training programmes rather than by their roles.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing and deactivating organisations</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click on an organisation row to open its settings.</li>
        <li>Update any field (name, slug, training programs, roles) and click <strong>Save</strong>.</li>
        <li>To deactivate an organisation, toggle the <strong>Active</strong> switch off. Deactivated organisations&apos; users will be blocked from signing in.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Assigning document collections</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        From the organisation detail page, scroll to the <strong>Document Collections</strong> section. Toggle collections on or off to control which document libraries are available to users in this organisation. Collections with no organisation filter are visible to everyone by default.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Assigning surveys</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        In the <strong>Surveys</strong> section of the organisation detail page, toggle published surveys to assign them to this organisation. Only published and closed surveys appear in the list (drafts are excluded). Users in the organisation will see assigned surveys in their dashboard.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Viewing organisation users</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        From the organisation detail view, you can see all users belonging to that organisation along with their roles and activity status.
      </p>

      <Tip>Deactivating an organisation immediately prevents all its users from logging in. Use this for offboarding or temporarily suspending access.</Tip>
    </>
  )
}
