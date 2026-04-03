'use client'

import { useState } from 'react'
import {
  CheckCircle,
  XCircle,
  Download,
  FileText,
  FileCheck,
  Sparkles,
  Layout,
  Accessibility,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Wrench,
  Heart,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import { CvStepLayout } from '@/components/cv-builder/cv-step-layout'

interface StepProps {
  cvId: string
  data: any
  onUpdate: (fields: Record<string, any>) => void
  onSectionChange?: () => void
}

interface CheckItem {
  label: string
  passed: boolean
}

const TEMPLATES = [
  {
    id: 'CLASSIC' as const,
    name: 'Classic',
    icon: Layout,
    description: 'Traditional layout with clear sections. A safe choice for any industry.',
  },
  {
    id: 'MODERN' as const,
    name: 'Modern',
    icon: Sparkles,
    description: 'Clean, contemporary design with subtle colour accents and a sidebar layout.',
  },
  {
    id: 'ACCESSIBLE' as const,
    name: 'Accessible',
    icon: Accessibility,
    description:
      'Optimised for screen readers with high-contrast text, large fonts, and clear structure.',
  },
]

export function ReviewStep({ cvId, data, onUpdate }: StepProps) {
  const [completing, setCompleting] = useState(false)
  const currentTemplate = data?.template || 'CLASSIC'

  // Build completion checklist
  const checks: CheckItem[] = [
    { label: 'Full name provided', passed: !!data?.fullName?.trim() },
    { label: 'Email address provided', passed: !!data?.email?.trim() },
    { label: 'Phone number provided', passed: !!data?.phone?.trim() },
    { label: 'Personal statement written', passed: !!data?.personalStatement?.trim() },
    {
      label: 'At least one education entry',
      passed: (data?.educationEntries?.length || 0) > 0,
    },
    {
      label: 'At least one skill listed',
      passed: (data?.skills?.length || 0) > 0,
    },
    {
      label: 'References provided or marked as available',
      passed: data?.refsAvailableOnRequest || (data?.references?.length || 0) > 0,
    },
  ]

  const passedCount = checks.filter((c) => c.passed).length
  const allPassed = passedCount === checks.length
  const isComplete = data?.status === 'COMPLETE'

  async function handleMarkComplete() {
    setCompleting(true)
    try {
      onUpdate({ status: 'COMPLETE' })
    } finally {
      setCompleting(false)
    }
  }

  function handleTemplateSelect(template: string) {
    onUpdate({ template })
  }

  // Helper to format date ranges
  function formatDateRange(start: string, end?: string | null, isCurrent?: boolean) {
    const fmt = (d: string) => {
      const date = new Date(d + '-01')
      return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    }
    const startStr = fmt(start)
    if (isCurrent) return `${startStr} - Present`
    if (end) return `${startStr} - ${fmt(end)}`
    return startStr
  }

  return (
    <CvStepLayout
      stepNumber={8}
      title="Review & Download"
      description="Here's your CV! Check everything looks right, choose a style, and download it."
    >
      {/* Completion checklist */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Completion checklist ({passedCount}/{checks.length})
        </h3>
        <div className="space-y-2">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center gap-2 text-sm"
            >
              {check.passed ? (
                <CheckCircle className="h-4 w-4 text-sage-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
              )}
              <span
                className={
                  check.passed
                    ? 'text-slate-700 dark:text-slate-300'
                    : 'text-slate-400 dark:text-slate-500'
                }
              >
                {check.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Template picker */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          Choose a template
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon
            const selected = currentTemplate === tmpl.id
            return (
              <button
                key={tmpl.id}
                onClick={() => handleTemplateSelect(tmpl.id)}
                className={clsx(
                  'rounded-xl border-2 p-4 text-left transition-all',
                  selected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-800'
                    : 'border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary-200 dark:hover:border-primary-700'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon
                    className={clsx(
                      'h-5 w-5',
                      selected
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                  <span
                    className={clsx(
                      'text-sm font-semibold',
                      selected
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {tmpl.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tmpl.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* CV Preview */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
          CV Preview
        </h3>
        <div className="rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-6 space-y-5">
          {/* Header */}
          <div className="border-b border-calm-200 dark:border-slate-600 pb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {data?.fullName || 'Your Name'}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {data?.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {data.email}
                </span>
              )}
              {data?.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {data.phone}
                </span>
              )}
              {data?.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {data.city}
                  {data?.postcode && `, ${data.postcode}`}
                </span>
              )}
            </div>
          </div>

          {/* Personal Statement */}
          {data?.personalStatement && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5">
                Personal Statement
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                {data.personalStatement}
              </p>
            </div>
          )}

          {/* Work Experience */}
          {data?.workExperiences?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Briefcase className="h-3 w-3" />
                Work Experience
              </h3>
              <div className="space-y-3">
                {data.workExperiences.map((exp: any) => (
                  <div key={exp.id}>
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {exp.jobTitle}
                      </p>
                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                        {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{exp.employer}</p>
                    {exp.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-line">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {data?.educationEntries?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="h-3 w-3" />
                Education
              </h3>
              <div className="space-y-3">
                {data.educationEntries.map((edu: any) => (
                  <div key={edu.id}>
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {edu.qualification}
                        {edu.grade && (
                          <span className="font-normal text-slate-500"> — {edu.grade}</span>
                        )}
                      </p>
                      <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                        {formatDateRange(edu.startDate, edu.endDate)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{edu.institution}</p>
                    {edu.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-line">
                        {edu.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {data?.skills?.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Wrench className="h-3 w-3" />
                Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {data.skills.map((skill: any) => (
                  <span
                    key={skill.id}
                    className="inline-block rounded-full bg-calm-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-300"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interests */}
          {data?.interests && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Heart className="h-3 w-3" />
                Interests
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                {data.interests}
              </p>
            </div>
          )}

          {/* References */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Users className="h-3 w-3" />
              References
            </h3>
            {data?.refsAvailableOnRequest ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Available on request
              </p>
            ) : data?.references?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.references.map((ref: any) => (
                  <div key={ref.id} className="text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{ref.name}</p>
                    {ref.jobTitle && (
                      <p className="text-slate-500 dark:text-slate-400">
                        {ref.jobTitle}
                        {ref.organisation && ` at ${ref.organisation}`}
                      </p>
                    )}
                    {ref.email && (
                      <p className="text-slate-500 dark:text-slate-400">{ref.email}</p>
                    )}
                    {ref.phone && (
                      <p className="text-slate-500 dark:text-slate-400">{ref.phone}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                No references provided
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`/api/cv-builder/${cvId}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Download as PDF
        </a>
        <a
          href={`/api/cv-builder/${cvId}/docx`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 px-6 py-2.5 text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Download as Word
        </a>

        {!isComplete && (
          <button
            onClick={handleMarkComplete}
            disabled={completing || !allPassed}
            className={clsx(
              'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium transition-colors',
              allPassed
                ? 'bg-sage-600 text-white hover:bg-sage-700'
                : 'bg-calm-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            )}
            title={allPassed ? undefined : 'Complete all checklist items first'}
          >
            <FileCheck className="h-4 w-4" />
            {completing ? 'Saving...' : 'Mark as Complete'}
          </button>
        )}

        {isComplete && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-sage-50 dark:bg-sage-900/20 border border-sage-200 dark:border-sage-800 px-4 py-2.5 text-sm font-medium text-sage-700 dark:text-sage-300">
            <CheckCircle className="h-4 w-4" />
            CV marked as complete
          </div>
        )}
      </div>
    </CvStepLayout>
  )
}
