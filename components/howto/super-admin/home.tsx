import { Tip } from '@/components/howto/panel'

export default function HomePageBuilderHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Home Page Builder lets you compose a different landing page for each end-user role
        &mdash; Student, Intern, Employee, Practitioner, Careers Professional. Each role&apos;s
        page is built from <strong>blocks</strong>: hero banners, tile grids, rich text, images,
        and videos. Pick a role tab, add and arrange blocks, hit Save.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Picking a role</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Each role tab is independent &mdash; saving one role doesn&apos;t affect the others.</li>
        <li>Switching tabs reloads that role&apos;s saved blocks. Unsaved edits on the previous tab are lost &mdash; save before switching.</li>
        <li>Charity Admin, Charity Employee, and Org Admin don&apos;t have a configurable home page; they see their admin dashboards instead.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Block types</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Hero</strong> &mdash; large title + subtitle + optional image + call-to-action button. Use this once at the top.</li>
        <li><strong>Tiles</strong> &mdash; a responsive grid of clickable cards (2, 3, or 4 columns). Each tile has a title, description, optional thumbnail, and optional link.</li>
        <li><strong>Text</strong> &mdash; rich HTML content. Sanitised on save; scripts and event handlers stripped.</li>
        <li><strong>Image</strong> &mdash; a single image with alt text and optional link wrap.</li>
        <li><strong>Video</strong> &mdash; an uploaded MP4/WebM with optional poster image. Use the YouTube/Vimeo embed inside a Text block if you need an embed.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Adding and editing blocks</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click one of the <strong>Add</strong> buttons at the bottom &mdash; a new block appears at the end of the list.</li>
        <li>Use the up/down arrows in the block header to reorder, the trash icon to delete.</li>
        <li>For images and videos, paste a URL or click <strong>Upload</strong> &mdash; uploads go to Vercel Blob.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Preview and save</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click <strong>Preview</strong> to see what the role will see &mdash; click again to return to editing.</li>
        <li>Click <strong>Save</strong> to publish. Users in that role see the new page on next load.</li>
        <li>If a role has no blocks saved, users in that role see a fallback &ldquo;Welcome&rdquo; placeholder.</li>
      </ul>

      <Tip>Build one role first as a template, then copy-paste blocks into the others by switching tabs and using the JSON in your browser&apos;s storage if you want to duplicate. Or just start with a Hero + Tiles combo on every role &mdash; it&apos;s a strong default.</Tip>
    </>
  )
}
