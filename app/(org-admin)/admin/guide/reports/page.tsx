import { BarChart3, CheckCircle } from 'lucide-react'
import { GuideSubpage } from '@/components/guide/subpage'

export const metadata = { title: 'Reports | Guide' }

export default function GuideReportsPage() {
  return (
    <GuideSubpage
      parentHref="/admin/guide"
      parentLabel="Back to Guide"
      icon={BarChart3}
      title="Reports"
      accent="emerald"
    >
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
    </GuideSubpage>
  )
}
