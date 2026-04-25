import { Briefcase } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Job Openings | Guide' }

export default function GuideJobsPage() {
  return (
    <GuideSubpage
      parentHref="/super-admin/guide"
      parentLabel="Back to Guide"
      icon={Briefcase}
      title="Job Openings"
      accent="purple"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Job Openings are curated roles (internships, apprenticeships, part-time, full-time, volunteer) surfaced to your learners &mdash; students, interns, employees, and their Careers Professionals.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating a job</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Go to <strong>Job Openings</strong> in the sidebar and click <strong>New job</strong>.</li>
        <li>Fill in the employer, title, location type (on-site / hybrid / remote), employment type, and closing date.</li>
        <li>Add a summary, full description, required skills, and &mdash; importantly &mdash; any <strong>autism-friendly notes</strong> (e.g. low-noise office, flexible hours, clear written instructions).</li>
        <li>Add apply URL and/or a contact email for direct applications.</li>
        <li>Optionally upload an employer logo and PDF attachments (e.g. a full job spec).</li>
        <li>Set status to <strong>Published</strong> to make it visible to learners. Jobs auto-close after their closing date.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Targeting and assignments</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Restrict visibility to specific organisations or roles via the targeting fields.</li>
        <li>Explicitly <strong>assign</strong> a job to a named learner so it&apos;s highlighted for them. Careers Professionals can also do this.</li>
      </ul>

      <Tip>Keep autism-friendly notes plain and specific &mdash; they&apos;re a key trust signal for learners applying to a role.</Tip>
    </GuideSubpage>
  )
}
