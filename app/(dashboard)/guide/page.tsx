'use client'

import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Calendar,
  Settings,
  HelpCircle,
  ClipboardList,
  Lock,
  BarChart3,
} from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  CAREGIVER: 'Practitioner',
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
  const isPractitioner = role === 'CAREGIVER'

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
            <li>Upcoming virtual classroom sessions are displayed so you never miss a session</li>
            <li>Pending surveys (if any) appear as cards — click to complete them inline</li>
            <li>Training progress statistics show your completion rate across all assigned modules</li>
            <li>Use the sidebar to quickly access all features available to your role</li>
          </ol>
          <Tip>Check your dashboard regularly for new announcements and upcoming sessions.</Tip>
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
            <li>Lessons can be text-based or video-based</li>
            <li>After completing a lesson, take the quiz to test your understanding</li>
            <li>Your progress is tracked automatically — completed lessons show a green checkmark</li>
          </ol>
          <Tip>You can revisit completed lessons at any time to refresh your knowledge.</Tip>
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
      title: 'Virtual Classroom Sessions',
      icon: Calendar,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Virtual classroom sessions let you attend live training with your colleagues.
          </p>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Joining sessions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>View your upcoming and past sessions on the Sessions page</li>
            <li>Upcoming sessions show the date, time, host, and platform (Zoom/Teams/Custom)</li>
            <li>Click &quot;Join Meeting&quot; to join a session when it&apos;s live</li>
            <li>Past sessions may include a recording URL if one was added by the host</li>
          </ol>
          <Tip>Your dashboard also shows upcoming sessions in a quick-view card for easy access.</Tip>
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
    {
      title: 'Security & MFA',
      icon: Lock,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Keep your account secure with strong passwords and multi-factor authentication.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>If you use email/password login, you can change your password in Settings</li>
            <li>If your admin set a forced password change, you&apos;ll be prompted to change it on next login</li>
            <li>SSO users (Google or Microsoft sign-in) manage their password through their identity provider</li>
          </ol>
        </>
      ),
    },
  ]

  const practitionerSections: GuideSection[] = [
    {
      title: 'Child Observations',
      icon: Users,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Record and track observations for children in your care to identify patterns and support development.
          </p>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Adding children and observations</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>Add children to your profile with their name, date of birth, and notes</li>
            <li>Record observations for each child: select a behaviour, domain (Social Communication, Behaviour &amp; Play, Sensory Responses), frequency, and context</li>
            <li>View all observations for a child on their profile page</li>
            <li>AI-generated insights are available: click &quot;Generate Insights&quot; on a child&apos;s page for AI analysis of patterns and recommendations</li>
          </ol>
          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Important disclaimer:</strong> This tool does not diagnose. Share observations with your GP or health visitor.
            </p>
          </div>
        </>
      ),
    },
    {
      title: 'Reports',
      icon: BarChart3,
      content: (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            View reports to understand training progress and observation patterns.
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>View your personal training progress and completion statistics</li>
            <li>See observation summaries and charts for your children</li>
            <li>Reports use charts to visualise patterns across domains and frequencies</li>
          </ol>
        </>
      ),
    },
  ]

  const allSections = isPractitioner
    ? [...commonSections, ...practitionerSections]
    : commonSections

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      {!isPractitioner && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 rounded-r-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Your Role: {roleLabel}</strong> — Your primary focus is completing your assigned training programs.
            Check your dashboard regularly for new announcements, surveys, and upcoming sessions.
          </p>
        </div>
      )}
    </div>
  )
}
