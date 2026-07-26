import { Tip } from '@/components/howto/panel'

export default function HomePageBuilderHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Home Page Builder composes the landing page learners see. There is one
        <strong> default</strong> page shown to everyone, and you can optionally give an individual
        organisation its own page that replaces the default for its members. Pages are built from
        <strong> blocks</strong>: hero banners, tile grids, rich text, images, and videos. Pick what
        you&apos;re editing from the dropdown, add and arrange blocks, hit Save.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Default page vs an organisation&apos;s own</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Default</strong> is shown to every organisation that hasn&apos;t been given its own page. Most of the time this is the only one you need.</li>
        <li>Choosing an organisation edits a page just for its members. It replaces the default for them entirely &mdash; blocks aren&apos;t merged.</li>
        <li>Each page is independent. Saving one never affects another.</li>
        <li>Switching between them reloads the saved blocks. Unsaved edits are lost &mdash; save before switching.</li>
        <li>To send an organisation back to the default, remove all of its blocks and save.</li>
        <li>Charity Admin, Charity Employee, and Org Admin don&apos;t see a configurable home page; they land on their admin dashboards instead.</li>
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

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Generating banners with AI</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Hero and Image blocks have an <strong>AI &#10024;</strong> button next to the URL field. Click it to
        generate a decorative banner illustration in the AAA brand style &mdash; vivid orange, magenta, green,
        amber, with cyan and lime accents on white. The AI suggests a starting prompt based on the role
        and any title or subtitle you&apos;ve typed; edit it if you want, then click <em>Generate banner</em>.
        Generation takes 10&ndash;30 seconds. The first run for a given prompt costs around 1&ndash;5p; the
        same prompt re-run is free (cached).
      </p>

      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Example prompts</h4>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Paste any of these as a starting point, or just use the AI suggestion.
      </p>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>
          <strong>Generic:</strong> Soft flowing organic shapes drifting across a white canvas in
          vivid orange and amber yellow, with magenta accents and a touch of vibrant green. Hand-drawn
          illustrative quality, gentle gradients, warm and optimistic.
        </li>
        <li>
          <strong>Getting-started hero:</strong> Bright radiating curves in orange, magenta, and lime
          green on white, hand-drawn illustrative style with soft gradients. Forward-looking, energetic,
          like the start of something new.
        </li>
        <li>
          <strong>Supportive hero:</strong> Layered organic shapes in teal, amber yellow, and orange
          flowing gently across a cream background. Hand-drawn illustrative quality with
          watercolor-like edges. Calm, professional warmth &mdash; good for a training-led page.
        </li>
        <li>
          <strong>Workplace hero:</strong> Interconnecting circles and curves in cyan, amber, and lime
          green with vivid orange highlights on white. Hand-drawn illustrative style, friendly and
          collaborative tone &mdash; good for an employer organisation&apos;s page.
        </li>
        <li>
          <strong>Geometric image block:</strong> Abstract dotted pattern with overlapping circles in
          vivid orange, magenta, and amber yellow on white. Soft hand-drawn quality, optimistic accent
          for a content section.
        </li>
      </ul>

      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Prompting tips</h4>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Lead with shape and motion &mdash; &ldquo;flowing&rdquo;, &ldquo;radiating&rdquo;, &ldquo;layered&rdquo;, &ldquo;interlocking&rdquo;.</li>
        <li>Name 2&ndash;3 colours maximum. The brand palette is enforced automatically; listing every colour produces busy results.</li>
        <li>Don&apos;t mention people, faces, text, or logos &mdash; those are off-limits by design.</li>
        <li>If output is too saturated, add &ldquo;with plenty of white space&rdquo; or &ldquo;minimalist&rdquo;. If too sparse, try &ldquo;densely layered&rdquo;.</li>
        <li>The <em>Try again</em> button is free for the same prompt (cached). Even one word changed counts as a fresh generation.</li>
      </ul>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Preview and save</h3>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click <strong>Preview</strong> to see the page as a learner will &mdash; click again to return to editing.</li>
        <li>Click <strong>Save</strong> to publish. Affected users see the new page on their next load.</li>
        <li>If the default has no blocks saved, learners see a fallback &ldquo;Welcome&rdquo; placeholder.</li>
      </ul>

      <Tip>Start with the default page &mdash; a Hero + Tiles combo is a strong baseline that works for everyone. Only give an organisation its own page when it genuinely needs different content, since every extra page is one more to keep up to date.</Tip>
    </>
  )
}
