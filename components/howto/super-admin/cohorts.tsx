import { Tip } from '@/components/howto/panel'

export default function CohortsHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        A <strong>Cohort</strong> is a lightweight group for workshop or programme attendees who don&apos;t belong to a registered organisation &mdash; e.g. participants from a public webinar or a community event. Members get a stripped-back &ldquo;Workshop Participant&rdquo; experience built around their cohort.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Setting up a cohort manually</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Open the <strong>Cohorts</strong> page from the sidebar.</li>
        <li>Click <strong>New Cohort</strong> and give it a name + any training programs you want members to access.</li>
        <li>From the cohort detail page, generate an <strong>invite link</strong> and share it &mdash; people sign themselves up by clicking it.</li>
        <li>You can also add members manually or import a CSV.</li>
        <li>Assign document collections and surveys, then schedule workshop sessions targeted at the cohort.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Importing a cohort from Eventbrite</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        If you&apos;re running a workshop on Eventbrite, you can link it directly &mdash; every booking on the event auto-enrolls the attendee as a cohort member, and we email them sign-in details so they can log in to your training platform too.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>One-time setup: paste your Eventbrite Private Token at <strong>Settings &rarr; Eventbrite</strong>. Pick the <em>Auto-invite</em> email policy (recommended) so unknown bookers get an account auto-created.</li>
        <li>On the Cohorts page, click <strong>From Eventbrite</strong> and paste the public Eventbrite event URL.</li>
        <li>We fetch the event details, create the cohort, and (in production) auto-register the booking webhook.</li>
        <li>On the new cohort&apos;s detail page, flip <strong>Show on catalogue</strong> on if you want the workshop to appear on the public <code>/courses</code> page so visitors can find it.</li>
        <li>Use <strong>Sync now</strong> to backfill anyone who&apos;s already booked. New bookings flow in automatically from then on.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">When the cohort ends</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Click <strong>Archive</strong>. Members keep their account and read-only access to past session recordings and toolkit downloads &mdash; new invites are disabled. Use <strong>Reactivate</strong> later if you need to bring it back.
      </p>

      <Tip>People can belong to several cohorts over time. Eventbrite-sourced cohorts work the same as manual ones &mdash; they just save you the manual roster step. The Eventbrite event itself is unaffected by anything you do on the platform.</Tip>
    </>
  )
}
