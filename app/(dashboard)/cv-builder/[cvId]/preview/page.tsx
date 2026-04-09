'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react'
import type { CVData } from '@/components/cv-builder/cv-wizard'

export default function CvPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const cvId = params.cvId as string

  const [cvData, setCvData] = useState<CVData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCV() {
      try {
        const res = await fetch(`/api/cv-builder/${cvId}`)
        if (res.ok) {
          const data = await res.json()
          setCvData(data)
        }
      } catch {
        // fetch error
      } finally {
        setLoading(false)
      }
    }
    fetchCV()
  }, [cvId])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-calm-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-9 w-28 bg-calm-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
        <div className="card animate-pulse space-y-4">
          <div className="h-8 w-48 bg-calm-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-full bg-calm-100 dark:bg-slate-600 rounded" />
          <div className="h-4 w-3/4 bg-calm-100 dark:bg-slate-600 rounded" />
          <div className="h-4 w-2/3 bg-calm-100 dark:bg-slate-600 rounded" />
        </div>
      </div>
    )
  }

  if (!cvData) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card text-center py-16">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">CV not found</h2>
          <button
            onClick={() => router.push('/cv-builder')}
            className="btn-primary inline-flex items-center gap-2 mt-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to CV Builder
          </button>
        </div>
      </div>
    )
  }

  // Template-aware class selection
  const isModern = cvData.template === 'MODERN'
  const isClassic = cvData.template === 'CLASSIC'

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-page-enter">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/cv-builder/${cvId}`)}
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to editor
        </button>
        <div className="flex items-center gap-2">
          <a
            href={`/api/cv-builder/${cvId}/pdf`}
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </a>
          <a
            href={`/api/cv-builder/${cvId}/docx`}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <FileText className="h-4 w-4" />
            Download Word
          </a>
        </div>
      </div>

      {/* CV Preview */}
      <div
        className={`bg-white dark:bg-slate-800 shadow-lg border border-calm-200 dark:border-slate-700 ${
          isModern ? 'rounded-3xl' : isClassic ? 'rounded-none' : 'rounded-2xl'
        } overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`px-8 py-8 ${
            isModern
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
              : isClassic
                ? 'border-b-2 border-slate-900 dark:border-slate-100'
                : 'bg-calm-50 dark:bg-slate-700/50 border-b border-calm-200 dark:border-slate-600'
          }`}
        >
          <h1
            className={`text-2xl font-bold ${
              isModern
                ? 'text-white'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {cvData.fullName || 'Your Name'}
          </h1>
          <div
            className={`flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm ${
              isModern ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {cvData.email && <span>{cvData.email}</span>}
            {cvData.phone && <span>{cvData.phone}</span>}
            {cvData.city && (
              <span>
                {cvData.city}
                {cvData.postcode ? `, ${cvData.postcode}` : ''}
              </span>
            )}
            {cvData.linkedIn && <span>{cvData.linkedIn}</span>}
          </div>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Personal Statement */}
          {cvData.personalStatement && (
            <section>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-2 ${
                isModern ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-100 border-b border-calm-200 dark:border-slate-600 pb-1'
              }`}>
                Personal Statement
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {cvData.personalStatement}
              </p>
            </section>
          )}

          {/* Work Experience */}
          {cvData.workExperiences.length > 0 && (
            <section>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${
                isModern ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-100 border-b border-calm-200 dark:border-slate-600 pb-1'
              }`}>
                Work Experience
              </h2>
              <div className="space-y-4">
                {cvData.workExperiences.map((exp) => (
                  <div key={exp.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{exp.jobTitle}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                        {exp.startDate} &ndash; {exp.isCurrent ? 'Present' : exp.endDate ?? ''}
                      </p>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{exp.employer}</p>
                    {exp.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {cvData.educationEntries.length > 0 && (
            <section>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${
                isModern ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-100 border-b border-calm-200 dark:border-slate-600 pb-1'
              }`}>
                Education
              </h2>
              <div className="space-y-4">
                {cvData.educationEntries.map((edu) => (
                  <div key={edu.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{edu.qualification}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                        {edu.startDate} &ndash; {edu.endDate ?? 'Present'}
                      </p>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{edu.institution}</p>
                    {edu.grade && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Grade: {edu.grade}</p>
                    )}
                    {edu.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{edu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {cvData.skills.length > 0 && (
            <section>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${
                isModern ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-100 border-b border-calm-200 dark:border-slate-600 pb-1'
              }`}>
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {cvData.skills.map((skill) => (
                  <span
                    key={skill.id}
                    className={`text-sm px-3 py-1 rounded-full ${
                      isModern
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'bg-calm-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Interests */}
          {cvData.interests && (
            <section>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-2 ${
                isModern ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-100 border-b border-calm-200 dark:border-slate-600 pb-1'
              }`}>
                Interests
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {cvData.interests}
              </p>
            </section>
          )}

          {/* References */}
          {(cvData.references.length > 0 || cvData.refsAvailableOnRequest) && (
            <section>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${
                isModern ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-100 border-b border-calm-200 dark:border-slate-600 pb-1'
              }`}>
                References
              </h2>
              {cvData.refsAvailableOnRequest && cvData.references.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">Available on request</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cvData.references.map((ref) => (
                    <div key={ref.id}>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{ref.name}</p>
                      {ref.jobTitle && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {ref.jobTitle}
                          {ref.organisation ? `, ${ref.organisation}` : ''}
                        </p>
                      )}
                      {ref.email && <p className="text-xs text-slate-400 dark:text-slate-500">{ref.email}</p>}
                      {ref.phone && <p className="text-xs text-slate-400 dark:text-slate-500">{ref.phone}</p>}
                    </div>
                  ))}
                  {cvData.refsAvailableOnRequest && cvData.references.length > 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic col-span-full">
                      Additional references available on request
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
