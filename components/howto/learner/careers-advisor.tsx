'use client'

import { useSession } from 'next-auth/react'
import { Tip } from '@/components/howto/panel'

export default function CareersAdvisorHowTo() {
  const { data: session } = useSession()
  const isCDO = session?.user?.role === 'CAREER_DEV_OFFICER'

  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Answer guided questions to get personalised career suggestions tailored to your interests, strengths, and preferences.
      </p>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">How it works</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click &quot;Careers Advisor&quot; in the sidebar and start a new session</li>
        <li>Answer 6 core questions about your interests, strengths, preferred work environment, concerns, experience, and current stage</li>
        <li>Each question uses easy-to-select options — just pick the ones that apply to you</li>
        <li>After the core questions, you can answer 4 optional questions for even better suggestions, or skip straight to your report</li>
        <li>Click &quot;Generate my report&quot; to get your personalised careers report</li>
      </ol>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Your report includes</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Your Strengths</strong> — a summary of what you&apos;re good at</li>
        <li><strong>Suggested Career Areas</strong> — 3-5 career ideas with explanations of why they suit you</li>
        <li><strong>Next Steps</strong> — practical things you can do right now</li>
        <li><strong>Workplace Support</strong> — tips for finding a comfortable work environment</li>
      </ul>
      <Tip>You can complete the questionnaire multiple times to get updated reports as your interests and experience change. Download your report as PDF to share with your careers professional.</Tip>
      {isCDO && (
        <>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Viewing your students&apos; reports</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>On the Careers Advisor page, click &quot;My Students&quot;</li>
            <li>You&apos;ll see all students, interns, and employees in your organisation</li>
            <li>Click &quot;View&quot; to see a student&apos;s completed reports</li>
          </ol>
        </>
      )}
    </>
  )
}
