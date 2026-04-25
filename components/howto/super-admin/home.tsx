import { Tip } from '@/components/howto/panel'

export default function HomePageBuilderHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Home Page Builder is the editor for the platform&apos;s landing page &mdash; the page
        every authenticated user lands on when they click <strong>Home Page</strong> in the
        sidebar. You write a short brief, the AI builds an accessible HTML layout, and you can
        then tweak it inline, with media buttons, or by editing the raw HTML.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Generating from a brief</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Open the editor: click <strong>Home Page</strong> in the sidebar, then the <strong>Edit</strong> pill on the live page.</li>
        <li>Describe what you want in the <strong>Brief</strong> box &mdash; audience, sections you want (hero, cards, call to action), tone.</li>
        <li>Click <strong>Generate with AI</strong>. Leave the brief empty to use the example brief shown beneath it.</li>
        <li>Generation <em>replaces</em> the whole page. Use <strong>Modify</strong> further down for smaller tweaks instead.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing inline</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click any text in the <strong>Editable preview</strong> and type to edit it directly.</li>
        <li>Inline edits are captured when you click <strong>Save</strong>, or when an AI action runs (the in-progress edit is committed first).</li>
        <li>For more control, expand <strong>View / edit raw HTML</strong> at the bottom &mdash; the preview updates as you type.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Adding media</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Image</strong> &mdash; upload a PNG, JPG, GIF, or SVG. It&apos;s stored on Vercel Blob and inserted at the bottom of the preview.</li>
        <li><strong>Video file</strong> &mdash; upload an MP4 or WebM. Renders with native browser controls.</li>
        <li><strong>YouTube / Vimeo</strong> &mdash; paste a watch URL; we convert it to an embed automatically.</li>
        <li>Newly added items appear at the bottom of the preview &mdash; cut and paste in the raw HTML view to reposition.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Modifying with AI</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Use <strong>Modify the existing layout</strong> for small focused changes &mdash; the AI keeps the rest of the page intact.</li>
        <li>Be specific: <em>&ldquo;change the hero heading to X and make the third card teal&rdquo;</em> works better than <em>&ldquo;improve it&rdquo;</em>.</li>
        <li>If the result isn&apos;t what you wanted, click <strong>Undo last AI change</strong> to revert &mdash; one level of undo is kept until you run another AI action.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Saving and publishing</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click <strong>Save</strong> to publish. All authenticated users see the new version on next page load.</li>
        <li>HTML is sanitised on save &mdash; scripts and inline event handlers are stripped automatically.</li>
        <li>Click <strong>View live</strong> (top-right) to see exactly what learners see.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">The default snapshot</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Make this the default</strong> &mdash; captures the currently saved page as a known-good snapshot. Save first, then click this to capture.</li>
        <li><strong>Reset to default</strong> &mdash; restores that snapshot and republishes immediately. Useful if an experiment goes wrong.</li>
        <li>Replacing the default overwrites the previous snapshot &mdash; there&apos;s only one slot.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Tuning the AI behaviour</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The two prompts powering this page &mdash; <strong>Home Page &mdash; Generate From Brief</strong>
        and <strong>Home Page &mdash; Modify Existing Layout</strong> &mdash; live in <strong>AI Prompts</strong>
        under the <em>Home Page</em> category. Edit them there to change tone, requirements, the
        model, or to attach context files (e.g. a brand style guide). Changes apply to the next
        generate/modify call.
      </p>

      <Tip>Use <strong>Make this the default</strong> after a clean save you&apos;re happy with. It&apos;s the quickest way to recover from a bad AI edit later &mdash; one click on <strong>Reset to default</strong> and you&apos;re back to the known-good page.</Tip>
    </>
  )
}
