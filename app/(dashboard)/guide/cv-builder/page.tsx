'use client'

import { useSession } from 'next-auth/react'
import { FileText } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export default function GuideCvBuilderPage() {
  const { data: session } = useSession()
  const isCDO = session?.user?.role === 'CAREER_DEV_OFFICER'

  return (
    <GuideSubpage
      parentHref="/guide"
      parentLabel="Back to Guide"
      icon={FileText}
      title="CV Builder"
      accent="primary"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Build a professional UK-format CV step by step, with AI assistance to help you write each section.
      </p>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating your CV</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click &quot;CV Builder&quot; in the sidebar to see your CVs</li>
        <li>Click &quot;Create your first CV&quot; (or &quot;Create another CV&quot; if you already have one)</li>
        <li>Follow the 8-step wizard: Your Details, About You, Work Experience, Education, Skills, Interests, References, and Review</li>
        <li>Each step has example text to guide you and you can skip steps and come back later</li>
        <li>Your progress is saved automatically as you type</li>
      </ol>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">AI writing assistance</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Look for the &quot;Help me write this&quot; or &quot;Improve with AI&quot; buttons below text boxes</li>
        <li>The AI will suggest text based on your experience and education</li>
        <li>You can accept the suggestion, try again for a different version, or write your own</li>
        <li>On the Skills step, click &quot;Suggest skills for me&quot; to get skill suggestions based on your work and education</li>
      </ol>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Downloading your CV</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>On the Review step, choose a template: Accessible (recommended), Modern, or Classic</li>
        <li>Download as PDF or Word format</li>
        <li>Click &quot;Mark as Complete&quot; when you&apos;re happy with it, then &quot;Done&quot; to go back to your CV list</li>
      </ol>
      <Tip>You can create multiple CVs tailored to different jobs. Just create another one from the CV list page.</Tip>
      {isCDO && (
        <>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Viewing your students&apos; CVs</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>On the CV Builder page, click the &quot;My Students&quot; tab</li>
            <li>You&apos;ll see all students, interns, and employees in your organisation</li>
            <li>Click &quot;View&quot; to see a student&apos;s CVs and preview or download them</li>
            <li>Student CVs are read-only — you can view and download but not edit them</li>
          </ol>
        </>
      )}
    </GuideSubpage>
  )
}
