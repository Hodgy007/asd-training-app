import { Tip } from '@/components/howto/panel'

export default function DashboardHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Your dashboard shows a personalised overview of your activity and what needs your attention.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Announcements from your organisation appear at the top of the page</li>
        <li>Upcoming virtual workshops are displayed so you never miss one</li>
        <li>Pending surveys (if any) appear as cards — click to complete them inline</li>
        <li>Training progress statistics show your completion rate across all assigned modules</li>
        <li>Use the sidebar to quickly access all features available to your role</li>
      </ol>
      <Tip>Check your dashboard regularly for new announcements and upcoming workshops.</Tip>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Surveys</h3>
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
    </>
  )
}
