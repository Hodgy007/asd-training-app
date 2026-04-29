'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Users, Loader2, Eye } from 'lucide-react'

interface StudentSummary {
  id: string
  name: string | null
  email: string
  role: string
  _count: {
    cvs: number
  }
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  STUDENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  INTERN: 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  EMPLOYEE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
}

export default function StudentsPage() {
  const { data: session } = useSession()
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudents() {
      try {
        const res = await fetch('/api/cv-builder/students')
        if (!res.ok) {
          setError('Failed to load students')
          return
        }
        const data = await res.json()
        setStudents(data)
      } catch {
        setError('Failed to load students')
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [])

  if (session?.user?.role !== 'CAREER_DEV_OFFICER') {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="card text-center py-16">
          <p className="text-slate-500 dark:text-slate-400">You do not have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
      <div>
        <Link
          href="/cv-builder"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My CVs
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">My Students&apos; CVs</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          View and review CVs created by students in your organisation.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
        </div>
      ) : error ? (
        <div className="card text-center py-16">
          <p className="text-red-500">{error}</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 bg-calm-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-slate-300 dark:text-slate-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            No students found
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm mx-auto">
            There are no students, interns, or employees in your organisation yet.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-calm-200 dark:border-slate-700">
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">
                  Name
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                  Email
                </th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">
                  Role
                </th>
                <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">
                  CVs
                </th>
                <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-6 py-3">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-calm-100 dark:divide-slate-700/50${students.length > 0 ? ' animate-stagger' : ''}`}>
              {students.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-calm-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {student.name || 'Unnamed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 hidden sm:table-cell">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {student.email}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        ROLE_BADGE_STYLES[student.role] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {ROLE_LABELS[student.role] || student.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {student._count.cvs}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/cv-builder/students/${student.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
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
