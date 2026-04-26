import { Download } from 'lucide-react'
import { Tip } from '@/components/howto/panel'

export default function ReportsHowTo() {
  return (
    <>
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

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">SCORM Quiz Analytics</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        For SCORM-packaged lessons, the <strong>SCORM Quiz Analytics</strong> tile aggregates per-question correctness rates across every learner who has attempted the course. Each row shows attempts, correct count, percentage correct, and average response time, sorted worst-first so material that needs revising floats to the top. The data is anonymised — never any individual learner&rsquo;s answers, just aggregates per question. Click <strong>Export CSV</strong> <Download className="inline h-3.5 w-3.5 text-slate-400" /> on any lesson card to download its rollup. Empty rows mean the SCORM package itself doesn&rsquo;t emit per-question results; this is normal for tools like Articulate Rise (which only reports overall completion).
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Survey reports</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Reports page includes a survey section showing totals for published, closed, and draft surveys. Expand any survey to see per-question response breakdowns, answer distributions, rating averages, and organisation-level response rates. Click <strong>Export CSV</strong> <Download className="inline h-3.5 w-3.5 text-slate-400" /> to download survey response data.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Document library reports</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Access library analytics from <strong>Document Library &rarr; Reports</strong>. View download counts per collection and per document, filter by organisation, and export the data as CSV.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Downloading overview data</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Overview dashboard displays key platform statistics including total organisations, users, completed lessons, and document downloads. The organisation summary table shows per-organisation metrics at a glance.
      </p>

      <Tip>Check reports regularly to identify organisations with low engagement. Consider reaching out to their Org Admins or creating targeted announcements to boost participation.</Tip>
    </>
  )
}
