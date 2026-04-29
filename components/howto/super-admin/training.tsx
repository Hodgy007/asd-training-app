import { Upload, Sparkles } from 'lucide-react'
import { Tip } from '@/components/howto/panel'

export default function TrainingHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Manage all training programs, modules, lessons, and quizzes from the <strong>Training Content</strong> page.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Viewing existing programs</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        The Training Content page lists all programs with their modules and current status. Use the <strong>View</strong> button to preview content as a learner (opens in a new tab) or the <strong>Edit</strong> button to modify content.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating training programs manually</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click <strong>Create Program</strong> and enter a title, description, and program type (ASD or Careers).</li>
        <li>Add modules to the program, each with a title and description.</li>
        <li>Within each module, add lessons using the WYSIWYG rich-text editor.</li>
        <li>Add quiz questions to each lesson &mdash; either manually or using AI generation.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        <span className="inline-flex items-center gap-1.5"><Upload className="h-4 w-4 text-primary-500" /> Import from Files</span>
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Upload PDF, DOCX, or PPTX files to auto-generate training content using AI. The platform analyses your existing material and organises it into modules, lessons, and quizzes while preserving the original wording as closely as possible. This is ideal for digitising existing training documents.
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click <strong>Import from Files</strong> on the Training Content page.</li>
        <li>Upload one or more files (PDF, DOCX, or PPTX).</li>
        <li>Review the AI-generated structure and make any adjustments.</li>
        <li>Save to create the program, modules, lessons, and quizzes.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary-500" /> Generate from Files</span>
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Upload files and let AI create entirely new, pedagogically-designed training content inspired by your material. Unlike Import, this generates fresh content rather than preserving original wording &mdash; ideal when you want to use source material as a foundation for new courses.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Editing modules and lessons</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Click <strong>Edit</strong> on any module or lesson to open the WYSIWYG editor. The editor supports rich text formatting, headings, lists, images, and more. After saving, you are redirected back to the module page.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Managing quiz questions</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Within any lesson, scroll to the <strong>Quiz Questions</strong> section.</li>
        <li>Click <strong>Add Question</strong> to create one manually, entering the question text, answer options, and correct answer.</li>
        <li>Alternatively, click <strong>Generate with AI</strong> to have Gemini create quiz questions based on the lesson content.</li>
        <li>Review and edit any AI-generated questions before saving.</li>
      </ol>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        <span className="inline-flex items-center gap-1.5"><Upload className="h-4 w-4 text-primary-500" /> Uploading SCORM packages</span>
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        SCORM is an industry-standard format for self-contained e-learning packages produced by authoring tools like Articulate, iSpring, Adobe Captivate, and Storyline. Upload a SCORM <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">.zip</code> to play a third-party course inline inside a lesson — no other lesson content (video, text, quiz, notes) renders when a lesson is set to SCORM.
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Two ways to import:
      </p>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Import as a new program</strong> — click <strong>Import SCORM</strong> on the Training Content page. Creates a draft program with a single module + lesson scaffolded from the package, ready to assign to organisations.</li>
        <li><strong>Replace an existing lesson</strong> — edit a lesson, set <strong>Type</strong> to <strong>SCORM package</strong>, drop the zip into the uploader.</li>
      </ul>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Supported versions:</strong> SCORM 1.2 and SCORM 2004 (3rd / 4th Edition / CAM 1.3). The version is detected from the manifest&rsquo;s <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">schemaversion</code>.</li>
        <li><strong>Multi-SCO packages</strong> render with a left-rail <strong>Contents</strong> sidebar driven by the manifest&rsquo;s <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">&lt;organization&gt;</code> tree — learners can jump between sections; their last-viewed page is restored on next visit.</li>
        <li><strong>Maximum package size:</strong> 200 MB.</li>
        <li><strong>Test packages:</strong> free SCORM samples (1.2 and 2004) are available at <a href="https://scorm.com/scorm-explained/technical-scorm/golf-examples/" className="text-primary-600 dark:text-primary-400 hover:underline" target="_blank" rel="noopener noreferrer">scorm.com</a>. Tip: <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">RuntimeBasicCalls</code> is a self-contained single-SCO course; the <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">ContentPackagingOneFilePerSCO</code> example is intentionally minimal per-page and meant to test the LMS&rsquo;s navigation tree.</li>
        <li><strong>Progress tracking:</strong> the learner&rsquo;s completion status and quiz score are saved to their training record and feed straight into the Training Completion report. On return, the package resumes — both the SCO&rsquo;s own state and (for multi-SCO) the last-viewed section.</li>
        <li><strong>Replacing a package:</strong> upload a new <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">.zip</code> over the existing one, or use <strong>Remove package</strong> to convert the lesson back to a normal text lesson.</li>
      </ul>
      <Tip>If a package fails to load, confirm <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-xs">imsmanifest.xml</code> sits at the <em>root</em> of the zip (not inside a wrapping folder). If a multi-SCO package only shows one short page, look for a <strong>Contents</strong> sidebar on the left — that&rsquo;s the navigation between sections.</Tip>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">SCORM quiz analytics</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Visit <strong>Reports &rarr; SCORM Quiz Analytics</strong> to see per-question correctness rates aggregated across all learners. Questions are sorted worst-first so material that needs updating surfaces immediately. Reports are anonymised — no individual learner data is shown. Empty rows mean the package doesn&rsquo;t emit per-question results (e.g. Articulate Rise reports overall completion only); use a <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">scormtype=&quot;sco&quot;</code> package such as Storyline output to see interactions.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Previewing content as a learner</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Click the <strong>View</strong> button on any program or module to open it in a new tab. This renders the content exactly as a learner would see it, allowing you to verify formatting, quiz flow, and overall experience.
      </p>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Program status workflow</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Programs follow a four-stage lifecycle:
      </p>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li><strong>Draft</strong> &mdash; initial creation and editing. Not visible to learners.</li>
        <li><strong>Under Review</strong> &mdash; content is being reviewed before approval.</li>
        <li><strong>Approved</strong> &mdash; published and visible to learners with appropriate access.</li>
        <li><strong>Archived</strong> &mdash; removed from active use but preserved for reference.</li>
      </ol>

      <Tip>Use &ldquo;Import from Files&rdquo; when you want to preserve your existing training material as-is. Use &ldquo;Generate from Files&rdquo; when you want AI to create new, pedagogically-structured content inspired by your source documents.</Tip>
    </>
  )
}
