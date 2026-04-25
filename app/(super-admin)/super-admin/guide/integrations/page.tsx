import { Plug } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Integrations | Guide' }

export default function GuideIntegrationsPage() {
  return (
    <GuideSubpage
      parentHref="/super-admin/guide"
      parentLabel="Back to Guide"
      icon={Plug}
      title="Integrations (Power Automate / Dynamics 365)"
      accent="purple"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The platform provides a reporting API that external tools like Microsoft Power Automate or Dynamics 365 can connect to. This allows you to automatically sync training, survey, and document library data into your existing Microsoft ecosystem.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">How it works</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Navigate to <strong>Integrations</strong> from the Settings page (Charity Admin only).</li>
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
    </GuideSubpage>
  )
}
