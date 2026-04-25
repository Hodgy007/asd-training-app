import { Tip } from '@/components/howto/panel'

export default function ImpactHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The <strong>Impact</strong> page is a charity-wide view of outcomes and engagement &mdash; designed for sharing with trustees, funders, and partners rather than for day-to-day operations.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">What it shows</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Headline numbers &mdash; learners trained, modules completed, workshops delivered, documents shared.</li>
        <li>Trends over time &mdash; month-on-month engagement and completion rates.</li>
        <li>Breakdowns by organisation type (School, College, Academy, University, Employer).</li>
      </ul>

      <Tip>Use the Impact page as the source for your quarterly and annual reports. Reports &rarr; CSV export is the best place for raw data.</Tip>
    </>
  )
}
