import { ClipboardList } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Surveys | Guide' }

export default function GuideSurveysPage() {
  return (
    <GuideSubpage
      parentHref="/guide"
      parentLabel="Back to Guide"
      icon={ClipboardList}
      title="Surveys"
      accent="primary"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Surveys help your organisation gather feedback and measure outcomes.
      </p>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">How surveys work</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Pending surveys appear on your dashboard</li>
        <li>Click a survey to open it and answer the questions</li>
        <li>Question types include: multiple choice, yes/no, free text, star ratings (1-5), and multi-select</li>
        <li>Required questions are marked with a red asterisk (*)</li>
        <li>Once submitted, your response is recorded and the survey disappears from your pending list</li>
      </ol>
      <Tip>Surveys may have a close date — complete them before they expire.</Tip>
    </GuideSubpage>
  )
}
