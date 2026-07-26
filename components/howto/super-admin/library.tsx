import { Pencil } from 'lucide-react'
import { Tip } from '@/components/howto/panel'

export default function LibraryHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Document Library lets you organise and distribute files (PDFs, documents, spreadsheets, etc.) to organisations. Documents are grouped into collections that can be targeted to specific organisations and roles.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating a collection</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Navigate to <strong>Document Library</strong> from the sidebar.</li>
        <li>Click <strong>New Collection</strong>.</li>
        <li>Enter a title and description for the collection.</li>
        <li>Optionally upload a thumbnail image to visually identify the collection.</li>
        <li>Select target organisations &mdash; leave empty to make the collection available to all organisations.</li>
        <li>Select target roles &mdash; choose whether the collection is visible to Learners, Org Admins, or both. Leave it empty to show it to everyone targeted by the organisation field.</li>
        <li>Click <strong>Save</strong> to create the collection.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Uploading documents</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click on a collection to open its detail page.</li>
        <li>Click <strong>Upload Document</strong> and select the file(s) you want to add.</li>
        <li>Each document can have its own title and description.</li>
        <li>Documents are stored securely and users download them directly from the platform.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing collection details</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Click the <Pencil className="inline h-3.5 w-3.5 text-slate-400" /> edit button next to the collection title on the detail page to update the name and description. Org Admins can also edit the title and description of collections assigned to their organisation.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Managing collection visibility</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Active / Inactive</strong> &mdash; toggle a collection on or off. Inactive collections are hidden from all users.</li>
        <li><strong>Target organisations</strong> &mdash; collections with no organisation filter are visible to everyone. Assigning specific organisations restricts access.</li>
        <li><strong>Target roles</strong> &mdash; restrict which user roles can see the collection within the targeted organisations.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Library reports</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Click <strong>Reports</strong> from the Library page to view download analytics. Reports show total downloads per collection and per document, with an organisation breakdown. You can filter by organisation and export the data as CSV.
      </p>

      <Tip>Collections with no organisation filter are visible to all users. To restrict access, assign specific organisations either from the collection settings or from the Organisation detail page.</Tip>
    </>
  )
}
