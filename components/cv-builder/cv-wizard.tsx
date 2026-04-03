'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, SkipForward, Check, Loader2 } from 'lucide-react'
import { CvProgressBar } from './cv-progress-bar'

// Import actual step components
import { PersonalDetailsStep } from './steps/personal-details-step'
import { PersonalStatementStep } from './steps/personal-statement-step'
import { WorkExperienceStep } from './steps/work-experience-step'
import { EducationStep } from './steps/education-step'
import { SkillsStep } from './steps/skills-step'
import { InterestsStep } from './steps/interests-step'
import { ReferencesStep } from './steps/references-step'
import { ReviewStep } from './steps/review-step'

// ---------- types ----------
export interface CVData {
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
  refsAvailableOnRequest: boolean
  createdAt: string
  updatedAt: string
  workExperiences: Array<{
    id: string
    jobTitle: string
    employer: string
    startDate: string
    endDate: string | null
    isCurrent: boolean
    description: string | null
    order: number
  }>
  educationEntries: Array<{
    id: string
    institution: string
    qualification: string
    grade: string | null
    startDate: string
    endDate: string | null
    description: string | null
    order: number
  }>
  skills: Array<{
    id: string
    name: string
    category: string | null
    order: number
  }>
  references: Array<{
    id: string
    name: string
    jobTitle: string | null
    organisation: string | null
    email: string | null
    phone: string | null
    relationship: string | null
    order: number
  }>
}

interface CvWizardProps {
  cvId: string
  initialData: CVData
}

export function CvWizard({ cvId, initialData }: CvWizardProps) {
  const [currentStep, setCurrentStep] = useState(initialData.currentStep)
  const [cvData, setCvData] = useState<CVData>(initialData)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    const set = new Set<number>()
    if (cvData.fullName && cvData.email) set.add(0)
    if (cvData.personalStatement) set.add(1)
    if (cvData.workExperiences.length > 0) set.add(2)
    if (cvData.educationEntries.length > 0) set.add(3)
    if (cvData.skills.length > 0) set.add(4)
    if (cvData.interests) set.add(5)
    if (cvData.references.length > 0 || cvData.refsAvailableOnRequest) set.add(6)
    return set
  })

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced PATCH for auto-save
  const patchCV = useCallback(
    (data: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSaving(true)
        try {
          const res = await fetch(`/api/cv-builder/${cvId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          if (res.ok) {
            const updated = await res.json()
            setCvData((prev) => ({ ...prev, ...updated }))
            setSavedAt(new Date())
          }
        } catch {
          // Silently fail for auto-save
        } finally {
          setSaving(false)
        }
      }, 500)
    },
    [cvId],
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Bridge for step components: they call onUpdate({ field: value })
  // which patches the CV and updates local state
  const handleStepUpdate = useCallback(
    (fields: Record<string, any>) => {
      setCvData((prev) => ({ ...prev, ...fields }))
      patchCV(fields)
    },
    [patchCV],
  )

  // Re-fetch full CV data after sub-item changes (work exp, education, skills, refs)
  const handleSectionChange = useCallback(async () => {
    try {
      const res = await fetch(`/api/cv-builder/${cvId}`)
      if (res.ok) {
        const fresh = await res.json()
        setCvData(fresh)
      }
    } catch {
      // Silently fail
    }
  }, [cvId])

  function goToStep(step: number) {
    if (step < 0 || step > 7) return
    setCurrentStep(step)
    patchCV({ currentStep: step })
  }

  // Render the active step using the real step components
  function renderStep() {
    const props = {
      cvId,
      data: cvData,
      onUpdate: handleStepUpdate,
      onSectionChange: handleSectionChange,
    }

    switch (currentStep) {
      case 0: return <PersonalDetailsStep {...props} />
      case 1: return <PersonalStatementStep {...props} />
      case 2: return <WorkExperienceStep {...props} />
      case 3: return <EducationStep {...props} />
      case 4: return <SkillsStep {...props} />
      case 5: return <InterestsStep {...props} />
      case 6: return <ReferencesStep {...props} />
      case 7: return <ReviewStep {...props} />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Top bar: progress + save indicator */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
            {cvData.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedAt ? (
              <>
                <Check className="h-3 w-3 text-sage-500" />
                <span>All changes saved</span>
              </>
            ) : null}
          </div>
        </div>
        <CvProgressBar currentStep={currentStep} completedSteps={completedSteps} />
      </div>

      {/* Step content */}
      <div className="card">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 0}
          className="btn-secondary inline-flex items-center gap-2 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {currentStep < 7 && (
            <button
              type="button"
              onClick={() => goToStep(currentStep + 1)}
              className="btn-secondary inline-flex items-center gap-2 text-sm"
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </button>
          )}
          {currentStep < 7 && (
            <button
              type="button"
              onClick={() => {
                setCompletedSteps((prev) => new Set([...prev, currentStep]))
                goToStep(currentStep + 1)
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
