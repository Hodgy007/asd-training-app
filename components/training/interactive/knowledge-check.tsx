'use client'

import { useState, useCallback } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { KnowledgeCheckData } from '@/types/interactive'
import { BlockInstructions } from './block-instructions'
import { BlockCompletionBadge } from './block-completion-badge'

interface KnowledgeCheckProps {
  title: string
  instructions: string
  data: KnowledgeCheckData
  completed: boolean
  onComplete: () => void
}

interface QuestionState {
  selectedOption: string | null
  isCorrect: boolean | null
}

export function KnowledgeCheck({
  title,
  instructions,
  data,
  completed,
  onComplete,
}: KnowledgeCheckProps) {
  const [questionStates, setQuestionStates] = useState<Record<string, QuestionState>>(() => {
    const initial: Record<string, QuestionState> = {}
    data.questions.forEach(q => {
      initial[q.id] = { selectedOption: null, isCorrect: null }
    })
    return initial
  })

  const handleOptionClick = useCallback(
    (questionId: string, option: string, correctAnswer: string) => {
      const isCorrect = option === correctAnswer

      setQuestionStates(prev => {
        // If already answered correctly, don't allow changes
        if (prev[questionId]?.isCorrect) return prev

        const updated = {
          ...prev,
          [questionId]: { selectedOption: option, isCorrect },
        }

        // Check if all questions are now correct
        const allCorrect = data.questions.every(q => {
          const state = q.id === questionId ? updated[q.id] : prev[q.id]
          return state?.isCorrect === true
        })

        if (allCorrect && !completed) {
          // Defer callback to avoid update-during-render
          setTimeout(() => onComplete(), 0)
        }

        return updated
      })
    },
    [data.questions, completed, onComplete]
  )

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 sm:p-6">
      <BlockInstructions title={title} instructions={instructions} />

      <div className="space-y-6 mt-4">
        {data.questions.map((q, qIdx) => {
          const state = questionStates[q.id]
          const answeredCorrectly = state?.isCorrect === true
          const answeredIncorrectly = state?.isCorrect === false

          return (
            <div key={q.id} className="space-y-3">
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                {qIdx + 1}. {q.question}
              </p>

              <div className="space-y-2">
                {q.options.map(option => {
                  const isSelected = state?.selectedOption === option
                  const isCorrectOption = option === q.correctAnswer

                  let optionClasses =
                    'w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors min-h-[44px] '

                  if (answeredCorrectly && isCorrectOption) {
                    optionClasses +=
                      'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                  } else if (answeredIncorrectly && isSelected) {
                    optionClasses +=
                      'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                  } else if (answeredCorrectly) {
                    optionClasses +=
                      'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-default'
                  } else {
                    optionClasses +=
                      'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 cursor-pointer'
                  }

                  return (
                    <button
                      key={option}
                      onClick={() =>
                        !answeredCorrectly &&
                        handleOptionClick(q.id, option, q.correctAnswer)
                      }
                      disabled={answeredCorrectly}
                      className={optionClasses}
                    >
                      <span className="flex items-center gap-2">
                        {answeredCorrectly && isCorrectOption && (
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        )}
                        {answeredIncorrectly && isSelected && (
                          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        )}
                        {option}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Feedback */}
              {answeredCorrectly && (
                <div className="flex items-start gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{q.feedback}</span>
                </div>
              )}
              {answeredIncorrectly && (
                <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Not quite -- try again.</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <BlockCompletionBadge completed={completed} />
    </div>
  )
}
