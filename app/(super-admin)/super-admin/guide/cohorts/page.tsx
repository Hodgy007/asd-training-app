import { Users2 } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Cohorts | Guide' }

export default function GuideCohortsPage() {
  return (
    <GuideSubpage
      parentHref="/super-admin/guide"
      parentLabel="Back to Guide"
      icon={Users2}
      title="Cohorts"
      accent="purple"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        A <strong>Cohort</strong> is a special kind of organisation used for group-based delivery &mdash; e.g. a training cohort for interns on a shared programme. They behave like organisations but are tagged so you can distinguish them in reports and target them separately.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Managing cohorts</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Open <strong>Cohorts</strong> from the sidebar.</li>
        <li>Create a new cohort with a name, training programs, and allowed roles.</li>
        <li>Add users and assign a cohort lead (Org Admin-equivalent).</li>
        <li>Cohorts support the same hierarchy, training-plan assignment, and reporting as regular organisations.</li>
      </ol>

      <Tip>Use cohorts when you want to ring-fence analytics for a specific intake or programme.</Tip>
    </GuideSubpage>
  )
}
