'use client'

import { useState } from 'react'
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

export function PersonalStatementStep({ cvId, data, onUpdate }: StepProps) {
  const [statement, setStatement] = useState<string>(data?.personalStatement || '')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [showAiModal, setShowAiModal] = useState(false)

  const charCount = statement.length
  const isShort = charCount > 0 && charCount < 150
  const isGood = charCount >= 150 && charCount <= 300
  const isLong = charCount > 300

  function handleChange(value: string) {
    setStatement(value)
    onUpdate({ personalStatement: value })
  }

  async function handleAiRequest() {
    setAiLoading(true)
    try {
      const res = await fetch(`/api/cv-builder/${cvId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'statement' }),
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
      setAiResult(json.result)
      setShowAiModal(true)
    } catch {
      // Silently handle - modal won't show
    } finally {
      setAiLoading(false)
    }
  }

  function handleAcceptAi() {
    if (aiResult) {
      setStatement(aiResult)
      onUpdate({ personalStatement: aiResult })
    }
    setShowAiModal(false)
    setAiResult('')
  }

  async function handleRetryAi() {
    setAiResult('')
    await handleAiRequest()
  }

  return (
    <CvStepLayout
      stepNumber={2}
      title="About You"
      description="Write a short paragraph about yourself. This is the first thing employers read, so keep it clear and positive."
    >
      <ExampleText>
        A motivated and reliable individual with strong attention to detail. Currently studying
        Business at City College, I am looking for an opportunity to develop my skills in a
        professional environment.
      </ExampleText>

      <div className="mt-4 space-y-2">
        <label
          htmlFor="cv-personal-statement"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Personal statement
        </label>

        <textarea
          id="cv-personal-statement"
          rows={6}
          placeholder="Write a few sentences about yourself, your goals, and what you can offer..."
          value={statement}
          onChange={(e) => handleChange(e.target.value)}
          className={TEXTAREA_CLASS}
        />

        <AiAssistButton onClick={handleAiRequest} loading={aiLoading} label="Help me write this" />

        <div className="flex items-center justify-between text-xs">
          <span
            className={
              isGood
                ? 'text-sage-600 dark:text-sage-400'
                : isShort || isLong
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 dark:text-slate-500'
            }
          >
            {charCount} characters
            {isShort && ' — a little short, aim for 150-300'}
            {isGood && ' — great length'}
            {isLong && ' — consider trimming to under 300'}
          </span>
          <span className="text-slate-400 dark:text-slate-500">Aim for 150-300 characters</span>
        </div>
      </div>

      <AiSuggestionModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        suggestion={aiResult}
        onAccept={handleAcceptAi}
        onRetry={handleRetryAi}
        loading={aiLoading}
      />
    </CvStepLayout>
  )
}
