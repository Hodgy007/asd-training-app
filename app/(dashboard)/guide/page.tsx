'use client'

import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Settings,
  HelpCircle,
  ClipboardList,
  FileText,
  Compass,
  FolderOpen,
  Briefcase,
} from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  CAREER_DEV_OFFICER: 'Careers Professional',
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

interface GuideSection {
  title: string
  icon: React.ElementType
  content: React.ReactNode
}

function SectionCard({ title, icon: Icon, content }: GuideSection) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 bg-primary-50 dark:bg-primary-900/20 border-b border-calm-200 dark:border-slate-700">
        <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <div className="px-6 py-5 space-y-4">
        {content}
      </div>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
      <p className="text-sm text-amber-800 dark:text-amber-300">{children}</p>
    </div>
  )
}

export default function GuidePage() {
  const { data: session } = useSession()
  const role = session?.user?.role ?? ''
  const roleLabel = ROLE_LABELS[role] ?? 'User'
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'

  const commonSections: GuideSection[] = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Your dashboard shows a personalised overview of your activity and what needs your attention.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Announcements from your organisation appear at the top of the page</li>
            <li>Upcoming virtual workshops are displayed so you never miss one</li>
            <li>Pending surveys (if any) appear as cards — click to complete them inline</li>
            <li>Training progress statistics show your completion rate across all assigned modules</li>
            <li>Use the sidebar to quickly access all features available to your role</li>
          </ol>
          <Tip>Check your dashboard regularly for new announcements and upcoming workshops.</Tip>
        </>
      ),
    },
    {
      title: 'Training',
      icon: BookOpen,
      content: (
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
            Some lessons are self-contained courses that play in a small window inside the page. These lessons have their own navigation, quizzes, and completion inside the course — the usual notes, read-aloud, and quiz cards do not appear. Your progress is saved automatically as you go, and the lesson will pick up where you left off next time you open it.
          </p>
          <Tip>You can revisit completed lessons at any time to refresh your knowledge, and jot down personal notes from the lesson page.</Tip>
        </>
      ),
    },
    {
      title: 'Surveys',
      icon: ClipboardList,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Surveys help your organisation gather feedback and measure outcomes.
          </p>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">How surveys work</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Pending surveys appear on your dashboard</li>
            <li>Click a survey to open it and answer the questions</li>
            <li>Question types include: multiple choice, yes/no, free text, star ratings (1-5), and multi-select</li>
            <li>Required questions are marked with a red asterisk (*)</li>
            <li>Once submitted, your response is recorded and the survey disappears from your pending list</li>
          </ol>
          <Tip>Surveys may have a close date — complete them before they expire.</Tip>
        </>
      ),
    },
    {
      title: 'Document Library',
      icon: FolderOpen,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Your organisation (or the charity) may share document collections with you — guides, templates, policies, or reading material.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Collections you have access to appear as individual links in the sidebar</li>
            <li>Click a collection to open it, then click any document to preview or download it</li>
            <li>New documents are added regularly — check back periodically for updates</li>
          </ol>
          <Tip>If you expect to see a collection that isn&apos;t showing up, contact your Org Admin — visibility is set per-role and per-organisation.</Tip>
        </>
      ),
    },
    {
      title: 'Virtual Workshops',
      icon: Calendar,
      content: (
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
          <Tip>Your dashboard also shows upcoming workshops in a quick-view card for easy access.</Tip>
        </>
      ),
    },
    {
      title: 'Settings',
      icon: Settings,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Manage your account preferences and security from the Settings page.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Change your password (if you logged in with email/password, not SSO)</li>
            <li>View your account details</li>
            <li>Your role and organisation are displayed here</li>
          </ol>
        </>
      ),
    },
  ]

  const isCVRole = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE'].includes(role)
  const isCDO = role === 'CAREER_DEV_OFFICER'

  const cvBuilderSections: GuideSection[] = [
    {
      title: 'CV Builder',
      icon: FileText,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Build a professional UK-format CV step by step, with AI assistance to help you write each section.
          </p>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Creating your CV</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Click &quot;CV Builder&quot; in the sidebar to see your CVs</li>
            <li>Click &quot;Create your first CV&quot; (or &quot;Create another CV&quot; if you already have one)</li>
            <li>Follow the 8-step wizard: Your Details, About You, Work Experience, Education, Skills, Interests, References, and Review</li>
            <li>Each step has example text to guide you and you can skip steps and come back later</li>
            <li>Your progress is saved automatically as you type</li>
          </ol>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">AI writing assistance</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Look for the &quot;Help me write this&quot; or &quot;Improve with AI&quot; buttons below text boxes</li>
            <li>The AI will suggest text based on your experience and education</li>
            <li>You can accept the suggestion, try again for a different version, or write your own</li>
            <li>On the Skills step, click &quot;Suggest skills for me&quot; to get skill suggestions based on your work and education</li>
          </ol>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Downloading your CV</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>On the Review step, choose a template: Accessible (recommended), Modern, or Classic</li>
            <li>Download as PDF or Word format</li>
            <li>Click &quot;Mark as Complete&quot; when you&apos;re happy with it, then &quot;Done&quot; to go back to your CV list</li>
          </ol>
          <Tip>You can create multiple CVs tailored to different jobs. Just create another one from the CV list page.</Tip>
          {isCDO && (
            <>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Viewing your students&apos; CVs</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>On the CV Builder page, click the &quot;My Students&quot; tab</li>
                <li>You&apos;ll see all students, interns, and employees in your organisation</li>
                <li>Click &quot;View&quot; to see a student&apos;s CVs and preview or download them</li>
                <li>Student CVs are read-only — you can view and download but not edit them</li>
              </ol>
            </>
          )}
        </>
      ),
    },
  ]

  const careersAdvisorSections: GuideSection[] = [
    {
      title: 'Careers Advisor',
      icon: Compass,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Answer guided questions to get personalised career suggestions tailored to your interests, strengths, and preferences.
          </p>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">How it works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Click &quot;Careers Advisor&quot; in the sidebar and start a new session</li>
            <li>Answer 6 core questions about your interests, strengths, preferred work environment, concerns, experience, and current stage</li>
            <li>Each question uses easy-to-select options — just pick the ones that apply to you</li>
            <li>After the core questions, you can answer 4 optional questions for even better suggestions, or skip straight to your report</li>
            <li>Click &quot;Generate my report&quot; to get your personalised careers report</li>
          </ol>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Your report includes</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li><strong>Your Strengths</strong> — a summary of what you&apos;re good at</li>
            <li><strong>Suggested Career Areas</strong> — 3-5 career ideas with explanations of why they suit you</li>
            <li><strong>Next Steps</strong> — practical things you can do right now</li>
            <li><strong>Workplace Support</strong> — tips for finding a comfortable work environment</li>
          </ul>
          <Tip>You can complete the questionnaire multiple times to get updated reports as your interests and experience change. Download your report as PDF to share with your careers professional.</Tip>
          {isCDO && (
            <>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Viewing your students&apos; reports</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>On the Careers Advisor page, click &quot;My Students&quot;</li>
                <li>You&apos;ll see all students, interns, and employees in your organisation</li>
                <li>Click &quot;View&quot; to see a student&apos;s completed reports</li>
              </ol>
            </>
          )}
        </>
      ),
    },
  ]

  const jobsSections: GuideSection[] = [
    {
      title: 'Jobs',
      icon: Briefcase,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The Jobs page lists current openings &mdash; internships, apprenticeships, part-time, full-time, and volunteer roles &mdash; curated for our learners, with autism-friendly notes where applicable.
          </p>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Browsing jobs</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Click <strong>Jobs</strong> in the sidebar to see the list of open roles</li>
            <li>Each listing shows the employer, location (on-site / hybrid / remote), employment type, and closing date</li>
            <li>Click a job to see the full description, required skills, autism-friendly notes, and any attached documents</li>
            <li>Use the apply link or contact details on the job to apply directly with the employer</li>
          </ol>
          {isCDO && (
            <>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-4">Assigning jobs to your students</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>Jobs can be directly assigned to specific students, interns, or employees you manage</li>
                <li>Assigned jobs are highlighted for that learner so they don&apos;t miss them</li>
                <li>Speak to the charity admin if you&apos;d like to discuss a role on behalf of a learner</li>
              </ol>
            </>
          )}
          <Tip>Jobs close automatically after the closing date. If something looks interesting, apply early.</Tip>
        </>
      ),
    },
  ]

  const allSections = isCVRole
    ? [...commonSections, ...cvBuilderSections, ...careersAdvisorSections, ...jobsSections]
    : commonSections

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="h-7 w-7 text-primary-500" />
          How to Guide
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Welcome, {firstName}! Here&apos;s everything you need to know about using the platform as a {roleLabel}.
        </p>
      </div>

      {allSections.map((section) => (
        <SectionCard key={section.title} {...section} />
      ))}

      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded-r-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Your Role: {roleLabel}</strong> — Your primary focus is completing your assigned training programs.
          Check your dashboard regularly for new announcements, surveys, and upcoming workshops.
        </p>
      </div>
    </div>
  )
}
