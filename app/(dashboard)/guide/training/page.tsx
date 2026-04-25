import { BookOpen } from 'lucide-react'
import { GuideSubpage, Tip } from '@/components/guide/subpage'

export const metadata = { title: 'Training | Guide' }

export default function GuideTrainingPage() {
  return (
    <GuideSubpage
      parentHref="/guide"
      parentLabel="Back to Guide"
      icon={BookOpen}
      title="Training"
      accent="primary"
    >
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
        Some lessons are self-contained courses that play in a small window inside the page. These lessons have their own navigation, quizzes, and completion inside the course — the usual notes, read-aloud, and quiz cards do not appear. Your progress is saved automatically as you go, and the lesson will pick up where you left off next time you open it.
      </p>
      <Tip>You can revisit completed lessons at any time to refresh your knowledge, and jot down personal notes from the lesson page.</Tip>
    </GuideSubpage>
  )
}
