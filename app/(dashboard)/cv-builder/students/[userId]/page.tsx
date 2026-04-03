'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, Download, ChevronDown, ChevronUp } from 'lucide-react'

interface StudentCV {
  id: string
  title: string
  template: 'ACCESSIBLE' | 'MODERN' | 'CLASSIC'
  status: 'DRAFT' | 'COMPLETE'
  currentStep: number
  fullName: string | null
  email: string | null
  phone: string | null
  city: string | null
  postcode: string | null
  linkedIn: string | null
  personalStatement: string | null
  interests: string | null
  updatedAt: string
  workExperiences: Array<{
    jobTitle: string
    company: string
    startDate: string | null
    endDate: string | null
    description: string | null
  }>
  educationEntries: Array<{
    institution: string
    qualification: string
    startDate: string | null
    endDate: string | null
    details: string | null
  }>
  skills: Array<{ name: string }>
  references: Array<{
    name: string
    relationship: string
    email: string | null
    phone: string | null
  }>
}

interface StudentData {
  student: {
    id: string
    name: string | null
    email: string
    role: string
  }
  cvs: StudentCV[]
}

const TEMPLATE_LABELS: Record<string, string> = {
  ACCESSIBLE: 'Accessible',
  MODERN: 'Modern',
  CLASSIC: 'Classic',
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  COMPLETE: 'bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300',
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student',
  INTERN: 'Intern',
  EMPLOYEE: 'Employee',
}

export default function StudentCVsPage() {
  const { data: session } = useSession()
  const params = useParams()
  const userId = params.userId as string
  const [data, setData] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCV, setExpandedCV] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStudentCVs() {
      try {
        const res = await fetch(`/api/cv-builder/students/${userId}`)
        if (res.status === 404) {
          setError('Student not found')
          return
        }
        if (!res.ok) {
          setError('Failed to load student data')
          return
        }
        const result = await res.json()
        setData(result)
      } catch {
        setError('Failed to load student data')
      } finally {
        setLoading(false)
      }
    }
    if (userId) fetchStudentCVs()
  }, [userId])

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/cv-builder/students"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Link>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : error ? (
          <div className="card text-center py-16">
            <p className="text-red-500">{error}</p>
          </div>
        ) : data ? (
          <>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {data.student.name || 'Unnamed Student'}
              </h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {ROLE_LABELS[data.student.role] || data.student.role}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{data.student.email}</p>

            <div className="mt-6 space-y-4">
              {data.cvs.length === 0 ? (
                <div className="card text-center py-16">
                  <div className="w-16 h-16 bg-calm-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-slate-300 dark:text-slate-500" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                    No CVs yet
                  </h2>
                  <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm mx-auto">
                    This student has not created any CVs yet.
                  </p>
                </div>
              ) : (
                data.cvs.map((cv) => (
                  <div key={cv.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          {cv.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-calm-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {TEMPLATE_LABELS[cv.template]}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[cv.status]}`}>
                            {cv.status === 'DRAFT' ? 'Draft' : 'Complete'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          Last edited {formatDate(cv.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <a
                          href={`/api/cv-builder/${cv.id}/pdf`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </a>
                        <a
                          href={`/api/cv-builder/${cv.id}/docx`}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="h-4 w-4" />
                          Word
                        </a>
                        <button
                          onClick={() => setExpandedCV(expandedCV === cv.id ? null : cv.id)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                          {expandedCV === cv.id ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Preview
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {expandedCV === cv.id && (
                      <div className="mt-4 pt-4 border-t border-calm-200 dark:border-slate-700 space-y-4 text-sm">
                        {/* Personal Details */}
                        {(cv.fullName || cv.email || cv.phone || cv.city) && (
                          <div>
                            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Personal Details</h4>
                            <div className="text-slate-600 dark:text-slate-400 space-y-0.5">
                              {cv.fullName && <p>{cv.fullName}</p>}
                              {cv.email && <p>{cv.email}</p>}
                              {cv.phone && <p>{cv.phone}</p>}
                              {cv.city && <p>{[cv.city, cv.postcode].filter(Boolean).join(', ')}</p>}
                              {cv.linkedIn && <p>{cv.linkedIn}</p>}
                            </div>
                          </div>
                        )}

                        {/* Personal Statement */}
                        {cv.personalStatement && (
                          <div>
                            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Personal Statement</h4>
                            <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line">{cv.personalStatement}</p>
                          </div>
                        )}

                        {/* Work Experience */}
                        {cv.workExperiences.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Experience</h4>
                            <div className="space-y-2">
                              {cv.workExperiences.map((exp, i) => (
                                <div key={i} className="text-slate-600 dark:text-slate-400">
                                  <p className="font-medium text-slate-700 dark:text-slate-300">
                                    {exp.jobTitle} at {exp.company}
                                  </p>
                                  {(exp.startDate || exp.endDate) && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                      {exp.startDate || '?'} - {exp.endDate || 'Present'}
                                    </p>
                                  )}
                                  {exp.description && <p className="mt-0.5">{exp.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Education */}
                        {cv.educationEntries.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Education</h4>
                            <div className="space-y-2">
                              {cv.educationEntries.map((edu, i) => (
                                <div key={i} className="text-slate-600 dark:text-slate-400">
                                  <p className="font-medium text-slate-700 dark:text-slate-300">
                                    {edu.qualification} - {edu.institution}
                                  </p>
                                  {(edu.startDate || edu.endDate) && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                      {edu.startDate || '?'} - {edu.endDate || 'Present'}
                                    </p>
                                  )}
                                  {edu.details && <p className="mt-0.5">{edu.details}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        {cv.skills.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Skills</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {cv.skills.map((skill, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-0.5 rounded-full bg-calm-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                >
                                  {skill.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interests */}
                        {cv.interests && (
                          <div>
                            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Interests</h4>
                            <p className="text-slate-600 dark:text-slate-400">{cv.interests}</p>
                          </div>
                        )}

                        {/* References */}
                        {cv.references.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">References</h4>
                            <div className="space-y-1.5">
                              {cv.references.map((ref, i) => (
                                <div key={i} className="text-slate-600 dark:text-slate-400">
                                  <p className="font-medium text-slate-700 dark:text-slate-300">{ref.name}</p>
                                  <p className="text-xs">{ref.relationship}</p>
                                  {ref.email && <p className="text-xs">{ref.email}</p>}
                                  {ref.phone && <p className="text-xs">{ref.phone}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
