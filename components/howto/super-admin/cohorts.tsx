import { Tip } from '@/components/howto/panel'

export default function CohortsHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        A <strong>Cohort</strong> is a lightweight group for workshop or programme attendees who don&apos;t belong to a registered organisation &mdash; e.g. participants from a public webinar or a community event. Members get a stripped-back &ldquo;Workshop Participant&rdquo; experience built around their cohort.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Setting up a cohort</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Open the <strong>Products</strong> tile and click <strong>Cohorts</strong>.</li>
        <li>Create a cohort with a name and any training programs you want members to access.</li>
        <li>From the cohort page, generate an <strong>invite link</strong> and share it &mdash; people sign themselves up by clicking it.</li>
        <li>You can also add members manually or import a CSV.</li>
        <li>Assign document collections and surveys, then schedule workshop sessions targeted at the cohort.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">When the cohort ends</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Click <strong>Archive</strong>. Members keep their account and read-only access to past session recordings and toolkit downloads &mdash; new invites are disabled. Use <strong>Reactivate</strong> later if you need to bring it back.
      </p>

      <Tip>People can belong to several cohorts over time. Archiving never locks a participant out &mdash; they just stop receiving new content from that cohort.</Tip>
    </>
  )
}
