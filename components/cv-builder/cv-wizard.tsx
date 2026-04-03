'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, SkipForward, Check, Loader2 } from 'lucide-react'
import { CvProgressBar } from './cv-progress-bar'
import { CvStepLayout } from './cv-step-layout'
import { ExampleText } from './example-text'
import { AiAssistButton } from './ai-assist-button'
import { AiSuggestionModal } from './ai-suggestion-modal'

// ---------- types ----------
interface WorkExperience {
  id: string
  jobTitle: string
  employer: string
  startDate: string
  endDate: string | null
  isCurrent: boolean
  description: string | null
  order: number
}

interface Education {
  id: string
  institution: string
  qualification: string
  grade: string | null
  startDate: string
  endDate: string | null
  description: string | null
  order: number
}

interface Skill {
  id: string
  name: string
  category: string | null
  order: number
}

interface Reference {
  id: string
  name: string
  jobTitle: string | null
  organisation: string | null
  email: string | null
  phone: string | null
  relationship: string | null
  order: number
}

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
  workExperiences: WorkExperience[]
  educationEntries: Education[]
  skills: Skill[]
  references: Reference[]
}

const STEP_CONFIG = [
  { title: 'Your Details', description: 'Start with your basic contact information so employers can reach you.' },
  { title: 'About You', description: 'Write a short personal statement that introduces who you are and what you are looking for.' },
  { title: 'Work Experience', description: 'List your work history, starting with the most recent role.' },
  { title: 'Education', description: 'Add your qualifications, courses, and any relevant training.' },
  { title: 'Skills', description: 'Highlight the skills that make you a great candidate.' },
  { title: 'Interests', description: 'Share hobbies and interests that show your personality.' },
  { title: 'References', description: 'Add people who can vouch for your work and character.' },
  { title: 'Review', description: 'Check everything looks good before finishing your CV.' },
]

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
    // Mark steps as completed based on existing data
    if (cvData.fullName && cvData.email) set.add(0)
    if (cvData.personalStatement) set.add(1)
    if (cvData.workExperiences.length > 0) set.add(2)
    if (cvData.educationEntries.length > 0) set.add(3)
    if (cvData.skills.length > 0) set.add(4)
    if (cvData.interests) set.add(5)
    if (cvData.references.length > 0 || cvData.refsAvailableOnRequest) set.add(6)
    return set
  })

  // AI suggestion state
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiField, setAiField] = useState<string>('')

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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const onUpdate = useCallback(
    (field: string, value: unknown) => {
      setCvData((prev) => ({ ...prev, [field]: value }))
      patchCV({ [field]: value })
    },
    [patchCV],
  )

  function goToStep(step: number) {
    if (step < 0 || step > 7) return
    setCurrentStep(step)
    patchCV({ currentStep: step })
  }

  // AI assist — maps field names to AI action types
  async function requestAiHelp(field: string) {
    setAiField(field)
    setAiModalOpen(true)
    setAiLoading(true)
    setAiSuggestion('')

    // Map the field to the correct AI type the API expects
    const typeMap: Record<string, string> = {
      personalStatement: 'statement',
      interests: 'statement', // reuse statement generation for interests
    }
    const aiType = typeMap[field] || 'statement'

    try {
      const res = await fetch(`/api/cv-builder/${cvId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: aiType, context: {} }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiSuggestion(data.result ?? '')
      } else {
        setAiSuggestion('Sorry, something went wrong. Please try again.')
      }
    } catch {
      setAiSuggestion('Could not connect. Please check your connection and try again.')
    } finally {
      setAiLoading(false)
    }
  }

  function acceptAiSuggestion() {
    if (aiField && aiSuggestion) {
      onUpdate(aiField, aiSuggestion)
    }
    setAiModalOpen(false)
  }

  // ---------- Step content renderers ----------

  function renderYourDetails() {
    return (
      <CvStepLayout stepNumber={1} title="Your Details" description="Start with your basic contact information so employers can reach you.">
        <div className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={cvData.fullName ?? ''}
              onChange={(e) => onUpdate('fullName', e.target.value)}
              placeholder="e.g. Jordan Smith"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                value={cvData.email ?? ''}
                onChange={(e) => onUpdate('email', e.target.value)}
                placeholder="e.g. jordan@email.com"
              />
            </div>
            <div>
              <label className="label">Phone number</label>
              <input
                className="input"
                value={cvData.phone ?? ''}
                onChange={(e) => onUpdate('phone', e.target.value)}
                placeholder="e.g. 07700 900000"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">City / Town</label>
              <input
                className="input"
                value={cvData.city ?? ''}
                onChange={(e) => onUpdate('city', e.target.value)}
                placeholder="e.g. Cardiff"
              />
            </div>
            <div>
              <label className="label">Postcode</label>
              <input
                className="input"
                value={cvData.postcode ?? ''}
                onChange={(e) => onUpdate('postcode', e.target.value)}
                placeholder="e.g. CF10 1AA"
              />
            </div>
          </div>
          <div>
            <label className="label">LinkedIn (optional)</label>
            <input
              className="input"
              value={cvData.linkedIn ?? ''}
              onChange={(e) => onUpdate('linkedIn', e.target.value)}
              placeholder="e.g. linkedin.com/in/jordansmith"
            />
          </div>
        </div>
      </CvStepLayout>
    )
  }

  function renderAboutYou() {
    return (
      <CvStepLayout stepNumber={2} title="About You" description="Write a short personal statement that introduces who you are and what you are looking for.">
        <div className="space-y-4">
          <ExampleText>
            <strong>Example:</strong> &quot;A motivated and reliable individual looking for an opportunity to develop my skills in customer service. I enjoy working as part of a team and take pride in doing my best.&quot;
          </ExampleText>
          <div>
            <label className="label">Personal statement</label>
            <textarea
              className="input min-h-[150px]"
              value={cvData.personalStatement ?? ''}
              onChange={(e) => onUpdate('personalStatement', e.target.value)}
              placeholder="Tell employers a bit about yourself..."
              rows={6}
            />
          </div>
          <AiAssistButton
            onClick={() => requestAiHelp('personalStatement')}
            loading={aiLoading && aiField === 'personalStatement'}
            label="Help me write my personal statement"
          />
        </div>
      </CvStepLayout>
    )
  }

  function renderWorkExperience() {
    return (
      <CvStepLayout stepNumber={3} title="Work Experience" description="List your work history, starting with the most recent role. Include volunteering or work placements too.">
        <div className="space-y-4">
          <ExampleText>
            Include job title, employer name, dates, and a brief description of what you did. Even short placements count!
          </ExampleText>
          {cvData.workExperiences.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">No work experience added yet.</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Use the step-specific forms to add entries. You can also skip this step if you have no work experience.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cvData.workExperiences.map((exp) => (
                <div key={exp.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{exp.jobTitle}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{exp.employer}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {exp.startDate} &ndash; {exp.isCurrent ? 'Present' : exp.endDate ?? ''}
                      </p>
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CvStepLayout>
    )
  }

  function renderEducation() {
    return (
      <CvStepLayout stepNumber={4} title="Education" description="Add your qualifications, courses, and any relevant training.">
        <div className="space-y-4">
          <ExampleText>
            Include your school, college, or training provider plus the qualification and dates. GCSEs, BTECs, apprenticeships, and online courses all count.
          </ExampleText>
          {cvData.educationEntries.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">No education entries added yet.</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Use the step-specific forms to add entries.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cvData.educationEntries.map((edu) => (
                <div key={edu.id} className="card">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{edu.qualification}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{edu.institution}</p>
                    {edu.grade && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Grade: {edu.grade}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {edu.startDate} &ndash; {edu.endDate ?? 'Present'}
                    </p>
                  </div>
                  {edu.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CvStepLayout>
    )
  }

  function renderSkills() {
    return (
      <CvStepLayout stepNumber={5} title="Skills" description="Highlight the skills that make you a great candidate.">
        <div className="space-y-4">
          <ExampleText>
            Think about things like: communication, teamwork, problem-solving, IT skills, customer service, time management, or any specialist skills.
          </ExampleText>
          {cvData.skills.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-slate-400 dark:text-slate-500 text-sm">No skills added yet.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cvData.skills.map((skill) => (
                <span
                  key={skill.id}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200 dark:border-primary-800"
                >
                  {skill.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </CvStepLayout>
    )
  }

  function renderInterests() {
    return (
      <CvStepLayout stepNumber={6} title="Interests" description="Share hobbies and interests that show your personality and transferable skills.">
        <div className="space-y-4">
          <ExampleText>
            <strong>Example:</strong> &quot;I enjoy playing football at weekends, which has helped me develop teamwork skills. I also like drawing and have sold artwork at local markets.&quot;
          </ExampleText>
          <div>
            <label className="label">Your interests and hobbies</label>
            <textarea
              className="input min-h-[120px]"
              value={cvData.interests ?? ''}
              onChange={(e) => onUpdate('interests', e.target.value)}
              placeholder="What do you enjoy doing in your spare time?"
              rows={5}
            />
          </div>
          <AiAssistButton
            onClick={() => requestAiHelp('interests')}
            loading={aiLoading && aiField === 'interests'}
            label="Help me describe my interests"
          />
        </div>
      </CvStepLayout>
    )
  }

  function renderReferences() {
    return (
      <CvStepLayout stepNumber={7} title="References" description="Add people who can vouch for your work and character.">
        <div className="space-y-4">
          <ExampleText>
            A reference is someone who can tell an employer about your skills and character. This could be a teacher, manager, or mentor. Always ask permission before listing someone.
          </ExampleText>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={cvData.refsAvailableOnRequest}
                onChange={(e) => onUpdate('refsAvailableOnRequest', e.target.checked)}
                className="rounded border-calm-300 dark:border-slate-600 text-primary-500 focus:ring-primary-400"
              />
              References available on request
            </label>
          </div>

          {cvData.references.length === 0 && !cvData.refsAvailableOnRequest ? (
            <div className="card text-center py-8">
              <p className="text-slate-400 dark:text-slate-500 text-sm">No references added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cvData.references.map((ref) => (
                <div key={ref.id} className="card">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{ref.name}</p>
                  {ref.jobTitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{ref.jobTitle}{ref.organisation ? `, ${ref.organisation}` : ''}</p>
                  )}
                  {ref.email && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{ref.email}</p>}
                  {ref.relationship && <p className="text-xs text-slate-400 dark:text-slate-500">Relationship: {ref.relationship}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CvStepLayout>
    )
  }

  function renderReview() {
    const templateLabels: Record<string, string> = {
      ACCESSIBLE: 'Accessible',
      MODERN: 'Modern',
      CLASSIC: 'Classic',
    }

    return (
      <CvStepLayout stepNumber={8} title="Review" description="Check everything looks good, then preview or download your CV.">
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Contact</p>
              <p className="font-bold text-slate-900 dark:text-slate-100">{cvData.fullName || 'Not set'}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{cvData.email || 'No email'}</p>
              {cvData.phone && <p className="text-sm text-slate-500 dark:text-slate-400">{cvData.phone}</p>}
              {cvData.city && <p className="text-sm text-slate-500 dark:text-slate-400">{cvData.city}{cvData.postcode ? `, ${cvData.postcode}` : ''}</p>}
            </div>
            <div className="card">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Summary</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{cvData.workExperiences.length} work experience{cvData.workExperiences.length !== 1 ? 's' : ''}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{cvData.educationEntries.length} education entr{cvData.educationEntries.length !== 1 ? 'ies' : 'y'}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{cvData.skills.length} skill{cvData.skills.length !== 1 ? 's' : ''}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{cvData.references.length} reference{cvData.references.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Template selector */}
          <div>
            <label className="label">CV Template</label>
            <div className="grid grid-cols-3 gap-3">
              {(['ACCESSIBLE', 'MODERN', 'CLASSIC'] as const).map((tmpl) => (
                <button
                  key={tmpl}
                  type="button"
                  onClick={() => onUpdate('template', tmpl)}
                  className={`card text-center py-4 cursor-pointer transition-all ${
                    cvData.template === tmpl
                      ? 'ring-2 ring-primary-500 border-primary-300 dark:border-primary-600'
                      : 'hover:border-primary-200 dark:hover:border-primary-700'
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{templateLabels[tmpl]}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <a
              href={`/cv-builder/${cvId}/preview`}
              className="btn-primary inline-flex items-center gap-2"
            >
              Preview CV
            </a>
            <button
              type="button"
              onClick={() => {
                onUpdate('status', 'COMPLETE')
                setCompletedSteps((prev) => new Set([...prev, 7]))
              }}
              className="btn-sage inline-flex items-center gap-2"
            >
              <Check className="h-4 w-4" />
              Mark as complete
            </button>
          </div>
        </div>
      </CvStepLayout>
    )
  }

  const stepRenderers = [
    renderYourDetails,
    renderAboutYou,
    renderWorkExperience,
    renderEducation,
    renderSkills,
    renderInterests,
    renderReferences,
    renderReview,
  ]

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
        {stepRenderers[currentStep]()}
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

      {/* AI Suggestion Modal */}
      <AiSuggestionModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        suggestion={aiSuggestion}
        onAccept={acceptAiSuggestion}
        onRetry={() => requestAiHelp(aiField)}
        loading={aiLoading}
      />
    </div>
  )
}
