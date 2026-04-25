import { CheckCircle, Pencil, BarChart3 } from 'lucide-react'

export default function LibraryHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The <strong>Document Library</strong> page lets you see all document collections that the charity
        has shared with your organisation, and tweak collection titles and descriptions where appropriate.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">What you can do</h3>
      <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <span>View all collections targeted to your organisation or to roles within it.</span>
        </li>
        <li className="flex items-start gap-2">
          <Pencil className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>Edit the title and description of a collection to better fit your context.</span>
        </li>
        <li className="flex items-start gap-2">
          <BarChart3 className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>See download stats for documents within your organisation.</span>
        </li>
      </ul>

      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Your users see visible collections as individual links in their sidebar. If a collection you
        expected is missing, speak to the charity &mdash; visibility is configured at the charity level.
      </p>
    </>
  )
}
