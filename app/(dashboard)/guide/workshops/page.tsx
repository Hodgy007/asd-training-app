import { Calendar } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Virtual Workshops | Guide' }

export default function GuideWorkshopsPage() {
  return (
    <GuideSubpage
      parentHref="/guide"
      parentLabel="Back to Guide"
      icon={Calendar}
      title="Virtual Workshops"
      accent="primary"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Virtual workshops let you attend live training with your colleagues.
      </p>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Joining workshops</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>View your upcoming and past workshops on the Workshops page</li>
        <li>Upcoming workshops show the date, time, host, and platform (Zoom/Teams/Custom)</li>
        <li>Click &quot;Join Meeting&quot; to join a workshop when it&apos;s live</li>
        <li>Past workshops may include a recording URL if one was added by the host</li>
      </ol>
      <Tip>Your dashboard also shows upcoming workshops in a quick-view card for easy access.</Tip>
    </GuideSubpage>
  )
}
