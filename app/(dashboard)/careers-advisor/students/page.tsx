'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Loader2, Users, FileText } from 'lucide-react'
import Link from 'next/link'
import { ROLE_LABELS } from '@/lib/rbac'

interface StudentWithCount {
  id: string
  name: string | null
  email: string
  role: string
  _count: { careerAdvisorSessions: number }
}

export default function CareersAdvisorStudentsPage() {
  const [students, setStudents] = useState<StudentWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/careers-advisor/students')
      .then((r) => r.json())
      .then(setStudents)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 animate-page-enter">
      <div>
        <Link
          href="/careers-advisor"
          className="inline-flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Careers Advisor
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Students</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          View your students&apos; careers advisor sessions and reports
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : students.length === 0 ? (
        <div className="flex items-center gap-3 bg-calm-50 dark:bg-slate-800 rounded-2xl p-6 border border-calm-200 dark:border-slate-700">
          <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No students found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Students in your organisation will appear here once they start using the Careers Advisor.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-calm-200 dark:divide-slate-700">
            <thead className="bg-calm-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Role</th>
                <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sessions</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className={`divide-y divide-calm-100 dark:divide-slate-700${students.length > 0 ? ' animate-stagger' : ''}`}>
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-calm-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{student.name || 'Unnamed'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{student.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {ROLE_LABELS[student.role] || student.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {student._count.careerAdvisorSessions}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/careers-advisor/students/${student.id}`}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
