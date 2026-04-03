'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Compass, CheckCircle2, Clock, Briefcase, ArrowRight, Shield, Star } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import type { AdvisorReport } from '@/types'

interface StudentInfo {
  id: string
  name: string | null
  email: string
  role: string
}

interface StudentSession {
  id: string
  status: 'IN_PROGRESS' | 'COMPLETE'
  currentStep: number
  report: AdvisorReport | null
  createdAt: string
}

export default function StudentAdvisorPage() {
  const params = useParams()
  const userId = params.userId as string
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [sessions, setSessions] = useState<StudentSession[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/careers-advisor/students/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setStudent(data.student)
        setSessions(data.sessions)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/careers-advisor/students"
          className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Students
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {student?.name || 'Student'}&apos;s Reports
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{student?.email}</p>
      </div>

      {sessions.length === 0 ? (
        <div className="flex items-center gap-3 bg-calm-50 dark:bg-slate-800 rounded-2xl p-6 border border-calm-200 dark:border-slate-700">
          <Compass className="w-8 h-8 text-slate-300 dark:text-slate-600 flex-shrink-0" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This student hasn&apos;t started any careers advisor sessions yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white dark:bg-slate-800 border border-calm-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-calm-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                    s.status === 'COMPLETE'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  )}>
                    {s.status === 'COMPLETE' ? (
                      <><CheckCircle2 className="w-3 h-3" /> Complete</>
                    ) : (
                      <><Clock className="w-3 h-3" /> In progress</>
                    )}
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  {expandedSession === s.id ? 'Hide' : 'View report'}
                </span>
              </button>

              {expandedSession === s.id && s.report && (
                <div className="border-t border-calm-200 dark:border-slate-700 p-6 space-y-6">
                  {/* Strengths */}
                  <section className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <h3 className="font-bold text-green-800 dark:text-green-300">Strengths</h3>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">{s.report.strengths}</p>
                  </section>

                  {/* Careers */}
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">Career Suggestions</h3>
                    </div>
                    <div className="grid gap-2">
                      {s.report.careers.map((c, i) => (
                        <div key={i} className="bg-calm-50 dark:bg-slate-700 rounded-xl p-4">
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{c.name}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{c.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Next Steps */}
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">Next Steps</h3>
                    </div>
                    <ol className="space-y-1">
                      {s.report.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-bold text-blue-600 dark:text-blue-400">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </section>

                  {/* Workplace Support */}
                  <section className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <h3 className="font-bold text-purple-800 dark:text-purple-300">Workplace Support</h3>
                    </div>
                    <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">{s.report.workplaceSupport}</p>
                  </section>
                </div>
              )}

              {expandedSession === s.id && !s.report && (
                <div className="border-t border-calm-200 dark:border-slate-700 p-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                    This session is still in progress — no report has been generated yet.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
