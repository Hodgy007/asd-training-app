'use client'

import { useSession } from 'next-auth/react'
import { Briefcase } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export default function GuideJobsPage() {
  const { data: session } = useSession()
  const isCDO = session?.user?.role === 'CAREER_DEV_OFFICER'

  return (
    <GuideSubpage
      parentHref="/guide"
      parentLabel="Back to Guide"
      icon={Briefcase}
      title="Jobs"
      accent="primary"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Jobs page lists current openings &mdash; internships, apprenticeships, part-time, full-time, and volunteer roles &mdash; curated for our learners, with autism-friendly notes where applicable.
      </p>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Browsing jobs</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click <strong>Jobs</strong> in the sidebar to see the list of open roles</li>
        <li>Each listing shows the employer, location (on-site / hybrid / remote), employment type, and closing date</li>
        <li>Click a job to see the full description, required skills, autism-friendly notes, and any attached documents</li>
        <li>Use the apply link or contact details on the job to apply directly with the employer</li>
      </ol>
      {isCDO && (
        <>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Assigning jobs to your students</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Jobs can be directly assigned to specific students, interns, or employees you manage</li>
            <li>Assigned jobs are highlighted for that learner so they don&apos;t miss them</li>
            <li>Speak to the charity admin if you&apos;d like to discuss a role on behalf of a learner</li>
          </ol>
        </>
      )}
      <Tip>Jobs close automatically after the closing date. If something looks interesting, apply early.</Tip>
    </GuideSubpage>
  )
}
