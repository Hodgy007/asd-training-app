import { Tip } from '@/components/howto/panel'

export default function TrainingHowTo() {
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Your assigned training programs appear in the sidebar. Each program contains modules with lessons and quizzes.
      </p>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Getting started</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>Click a training program in the sidebar to see its modules</li>
        <li>Click a module to see its lessons, then click a lesson to start</li>
        <li>Lessons can be text-based, video-based, or a packaged course (SCORM), and may include interactive elements like hotspot images and carousels</li>
        <li>Use the <strong>read-aloud player</strong> at the top of a lesson to listen to the content — carousels offer per-slide audio too</li>
        <li>Look for the <strong>Resources</strong> section on some lessons to download supporting PDFs</li>
        <li>After completing a lesson, take the quiz (if one is provided) to test your understanding</li>
        <li>Your progress is tracked automatically — completed lessons show a green checkmark, and finishing a module unlocks a Certificate of Completion</li>
      </ol>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Packaged lessons (SCORM)</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        Some lessons are self-contained courses that play directly in the page. These lessons have their own navigation, quizzes, and completion inside the course — the usual notes, read-aloud, and quiz cards do not appear.
      </p>
      <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
        <li>If the course has multiple sections, a <strong>Contents</strong> sidebar appears on the left. Click any item to jump straight to that section.</li>
        <li>Your progress saves automatically as you move through the lesson, and the next time you open it you&rsquo;ll come back to the section you were last viewing.</li>
        <li>Both the SCO&rsquo;s own quiz score and your completion status feed into your training record — the same place all other lesson progress is tracked.</li>
      </ul>
      <Tip>You can revisit completed lessons at any time to refresh your knowledge, and jot down personal notes from the lesson page.</Tip>
    </>
  )
}
