'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Wrench, Check } from 'lucide-react'
import { CvStepLayout } from '@/components/cv-builder/cv-step-layout'
import { ExampleText } from '@/components/cv-builder/example-text'
import { AiAssistButton } from '@/components/cv-builder/ai-assist-button'

interface StepProps {
  cvId: string
  data: any
  onUpdate: (fields: Record<string, any>) => void
  onSectionChange?: () => void
}

interface Skill {
  id?: string
  name: string
  category?: string | null
  order?: number
}

const CATEGORIES = ['Technical', 'Communication', 'Teamwork', 'Personal', 'Organisation'] as const

const CATEGORY_COLOURS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  Technical: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    darkBg: 'dark:bg-blue-900/30',
    darkText: 'dark:text-blue-300',
  },
  Communication: {
    bg: 'bg-primary-100',
    text: 'text-primary-700',
    darkBg: 'dark:bg-primary-900/30',
    darkText: 'dark:text-primary-300',
  },
  Teamwork: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    darkBg: 'dark:bg-green-900/30',
    darkText: 'dark:text-green-300',
  },
  Personal: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    darkBg: 'dark:bg-amber-900/30',
    darkText: 'dark:text-amber-300',
  },
  Organisation: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    darkBg: 'dark:bg-rose-900/30',
    darkText: 'dark:text-rose-300',
  },
}

const INPUT_CLASS =
  'w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors'

function getColours(category?: string | null) {
  if (!category || !CATEGORY_COLOURS[category]) {
    return {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      darkBg: 'dark:bg-slate-700',
      darkText: 'dark:text-slate-300',
    }
  }
  return CATEGORY_COLOURS[category]
}

export function SkillsStep({ cvId, data, onSectionChange }: StepProps) {
  // Keep a local copy of skills so we can update immediately on save
  const [skills, setSkills] = useState<Skill[]>(data?.skills || [])
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillCategory, setNewSkillCategory] = useState<string>(CATEGORIES[0])
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  // AI state
  const [aiLoading, setAiLoading] = useState(false)
  const [suggestedSkills, setSuggestedSkills] = useState<Array<{ name: string; category: string }>>([])

  // Sync from parent when data changes (e.g. after parent re-fetches)
  useEffect(() => {
    if (data?.skills) {
      setSkills(data.skills)
    }
  }, [data?.skills])

  async function saveSkills(updatedSkills: Skill[]) {
    setSaving(true)
    // Update local list immediately (optimistic)
    setSkills(updatedSkills)
    try {
      await fetch(`/api/cv-builder/${cvId}/skills`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          updatedSkills.map((s, i) => ({
            name: s.name,
            category: s.category || null,
            order: i,
          }))
        ),
      })
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 3000)
      // Sync parent in background
      onSectionChange?.()
    } finally {
      setSaving(false)
    }
  }

  function handleAddSkill() {
    if (!newSkillName.trim()) return
    const already = skills.some(
      (s) => s.name.toLowerCase() === newSkillName.trim().toLowerCase()
    )
    if (already) return

    const updated = [
      ...skills,
      { name: newSkillName.trim(), category: newSkillCategory, order: skills.length },
    ]
    setNewSkillName('')
    saveSkills(updated)
  }

  function handleRemoveSkill(index: number) {
    const updated = skills.filter((_, i) => i !== index)
    saveSkills(updated)
  }

  function handleAddSuggested(skill: { name: string; category: string }) {
    const already = skills.some(
      (s) => s.name.toLowerCase() === skill.name.toLowerCase()
    )
    if (already) return

    const updated = [
      ...skills,
      { name: skill.name, category: skill.category, order: skills.length },
    ]
    setSuggestedSkills((prev) => prev.filter((s) => s.name !== skill.name))
    saveSkills(updated)
  }

  async function handleAiSuggest() {
    setAiLoading(true)
    try {
      const res = await fetch(`/api/cv-builder/${cvId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'skills' }),
      })
      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          if (data.code === 'DAILY_LIMIT') {
            alert(data.error || 'You have reached today’s AI usage limit. Please try again tomorrow.')
          }
        }
        throw new Error('AI request failed')
      }
      const json = await res.json()
      // Filter out skills already in the list
      const existing = new Set(skills.map((s) => s.name.toLowerCase()))
      const suggestions = (json.result as Array<{ name: string; category: string }>).filter(
        (s) => !existing.has(s.name.toLowerCase())
      )
      setSuggestedSkills(suggestions)
    } catch {
      // Silently handle
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <CvStepLayout
      stepNumber={5}
      title="Skills"
      description="What are you good at? Include both practical skills (like using computers) and personal qualities (like being organised)."
    >
      <ExampleText>
        Think about skills from school, hobbies, volunteering, or everyday life — not just from
        jobs.
      </ExampleText>

      {/* AI suggestions section */}
      <div className="mt-4 mb-4">
        <AiAssistButton onClick={handleAiSuggest} loading={aiLoading} label="Suggest skills for me" />

        {suggestedSkills.length > 0 && (
          <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800">
            <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-2">
              Click to add suggested skills:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedSkills.map((skill) => {
                const colours = getColours(skill.category)
                return (
                  <button
                    key={skill.name}
                    onClick={() => handleAddSuggested(skill)}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all hover:ring-2 hover:ring-primary-300 ${colours.bg} ${colours.text} ${colours.darkBg} ${colours.darkText}`}
                  >
                    <Plus className="h-3 w-3" />
                    {skill.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Current skills */}
      {skills.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Your skills ({skills.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, index) => {
              const colours = getColours(skill.category)
              return (
                <span
                  key={skill.id || `${skill.name}-${index}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${colours.bg} ${colours.text} ${colours.darkBg} ${colours.darkText}`}
                >
                  {skill.name}
                  {skill.category && (
                    <span className="opacity-60 text-[10px]">({skill.category})</span>
                  )}
                  <button
                    onClick={() => handleRemoveSkill(index)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    aria-label={`Remove ${skill.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Success message after saving */}
      {justSaved && (
        <div className="mb-4 flex items-center gap-2 text-sm text-sage-600 dark:text-sage-400">
          <Check className="h-4 w-4" />
          <span>Saved!</span>
        </div>
      )}

      {skills.length === 0 && suggestedSkills.length === 0 && (
        <div className="text-center py-6 mb-4">
          <Wrench className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No skills added yet. Use the AI suggestions or add your own below.
          </p>
        </div>
      )}

      {/* Add custom skill */}
      <div className="bg-calm-50 dark:bg-slate-800/50 rounded-xl p-4 border border-calm-200 dark:border-slate-600">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Add a skill
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="e.g. Microsoft Excel"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddSkill()
              }
            }}
            className={`${INPUT_CLASS} flex-1`}
          />
          <select
            value={newSkillCategory}
            onChange={(e) => setNewSkillCategory(e.target.value)}
            className={`${INPUT_CLASS} sm:w-40`}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddSkill}
            disabled={!newSkillName.trim() || saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
    </CvStepLayout>
  )
}
