import { Tip } from '@/components/howto/panel'

export default function WorkshopsHowTo() {
  return (
    <>
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

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Workshops you booked on Eventbrite</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        If you booked a charity workshop via Eventbrite, you&apos;ll also see it here. The booking automatically adds you to the workshop&apos;s cohort, so you get all the related training and resources alongside the live session. You don&apos;t need to do anything extra &mdash; the Eventbrite confirmation email and any reminders still come from Eventbrite as normal.
      </p>

      <Tip>Your dashboard also shows upcoming workshops in a quick-view card for easy access.</Tip>
    </>
  )
}
