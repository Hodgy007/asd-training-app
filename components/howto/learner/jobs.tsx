import { Tip } from '@/components/howto/panel'

export default function JobsHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Jobs page lists current openings &mdash; internships, apprenticeships, part-time,
        full-time, and volunteer roles &mdash; with autism-friendly notes where the employer has
        provided them.
      </p>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Browsing jobs</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click <strong>Jobs</strong> in the sidebar to see the list of open roles</li>
        <li>Each listing shows the employer, location (on-site / hybrid / remote), employment type, and closing date</li>
        <li>Click a job to see the full description, required skills, autism-friendly notes, and any attached documents</li>
        <li>Use the apply link or contact details on the job to apply directly with the employer</li>
      </ol>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">
        Where the listings come from
      </h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Some are published by Ambitious about Autism and shown right across the platform</li>
        <li>Others are posted by your own organisation, and only its members see those</li>
        <li>
          A job may also be assigned to you individually, in which case it appears in your list even
          if it wasn&apos;t otherwise aimed at your organisation
        </li>
      </ul>
      <Tip>Jobs close automatically after the closing date. If something looks interesting, apply early.</Tip>
    </>
  )
}
