'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { CvStepLayout } from '@/components/cv-builder/cv-step-layout'
import { ExampleText } from '@/components/cv-builder/example-text'
import { AiAssistButton } from '@/components/cv-builder/ai-assist-button'
import { AiSuggestionModal } from '@/components/cv-builder/ai-suggestion-modal'

interface StepProps {
  cvId: string
  data: any
  onUpdate: (fields: Record<string, any>) => void
  onSectionChange?: () => void
}

const TEXTAREA_CLASS =
  'w-full rounded-xl border border-calm-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none'

export function InterestsStep({ cvId, data, onUpdate }: StepProps) {
  const [interests, setInterests] = useState<string>(data?.interests || '')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)

  function handleChange(value: string) {
    setInterests(value)
    onUpdate({ interests: value })
  }

  async function handleAiRequest() {
    setAiLoading(true)
    try {
      const res = await fetch(`/api/cv-builder/${cvId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'interests',
          context: { text: interests },
        }),
      })
      if (!res.ok) throw new Error('AI request failed')
      const json = await res.json()
      setAiResult(json.result)
      setShowAiModal(true)
    } catch {
      // Silently handle
    } finally {
      setAiLoading(false)
    }
  }

  function handleAcceptAi() {
    if (aiResult) {
      setInterests(aiResult)
      onUpdate({ interests: aiResult })
    }
    setShowAiModal(false)
    setAiResult('')
  }

  return (
    <CvStepLayout
      stepNumber={6}
      title="Interests & Hobbies"
      description="This is optional, but it helps employers see you as a whole person. What do you enjoy doing outside of work or study?"
    >
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2 mb-4">
        <Info className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          This section is optional. If you choose to include it, keep it brief and relevant.
        </p>
      </div>

      <ExampleText>
        I enjoy photography, particularly landscape and nature photography. I also volunteer at my
        local library on weekends, helping to organise community reading events.
      </ExampleText>

      <div className="mt-4 space-y-2">
        <label
          htmlFor="cv-interests"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Interests and hobbies
        </label>

        <textarea
          id="cv-interests"
          rows={5}
          placeholder="Tell employers what you enjoy outside of work or study..."
          value={interests}
          onChange={(e) => handleChange(e.target.value)}
          className={TEXTAREA_CLASS}
        />

        <AiAssistButton onClick={handleAiRequest} loading={aiLoading} label="Help me write this" />
      </div>

      <AiSuggestionModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        suggestion={aiResult}
        onAccept={handleAcceptAi}
        onRetry={() => {
          setAiResult('')
          handleAiRequest()
        }}
        loading={aiLoading}
      />
    </CvStepLayout>
  )
}
