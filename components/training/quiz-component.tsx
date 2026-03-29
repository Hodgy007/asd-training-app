'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

export interface QuizQuestion {
  id: string
  question: string
  options: string | string[]
  correctAnswer: string
  explanation: string
}

interface QuizComponentProps {
  questions: QuizQuestion[]
  onComplete: (score: number) => void
}

export function QuizComponent({ questions, onComplete }: QuizComponentProps) {
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const question = questions[currentQ]
  const isCorrect = selectedAnswer === question.correctAnswer

  function handleAnswer(option: string) {
    if (showResult) return
    setSelectedAnswer(option)
    setShowResult(true)
    if (option === question.correctAnswer) {
      setScore((s) => s + 1)
    }
  }

  function handleNext() {
    if (currentQ + 1 < questions.length) {
      setCurrentQ((q) => q + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    } else {
      setFinished(true)
      onComplete(score + (isCorrect ? 0 : 0)) // score is already updated
    }
  }

  if (finished) {
    const pct = Math.round(((score) / questions.length) * 100)
    return (
      <div className="text-center py-8 space-y-4">
        <div
          className={clsx(
            'w-20 h-20 rounded-full flex items-center justify-center mx-auto',
            pct >= 70 ? 'bg-sage-100' : 'bg-amber-100'
          )}
        >
          {pct >= 70 ? (
            <CheckCircle className="h-10 w-10 text-sage-500" />
          ) : (
            <XCircle className="h-10 w-10 text-amber-500" />
          )}
        </div>
        <div>
          <p className="text-3xl font-bold text-slate-900">{pct}%</p>
          <p className="text-slate-500 mt-1">
            {score} of {questions.length} correct
          </p>
        </div>
        <p className={clsx('text-sm font-medium', pct >= 70 ? 'text-sage-600' : 'text-amber-600')}>
          {pct >= 70
            ? 'Well done! Lesson marked as complete.'
            : 'Keep going — you can review the lesson content and try again.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500 font-medium">
          Question {currentQ + 1} of {questions.length}
        </span>
        <span className="text-slate-400">Score: {score}</span>
      </div>
      <div className="w-full h-1.5 bg-calm-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all"
          style={{ width: `${((currentQ) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-slate-900 font-semibold text-lg leading-snug">{question.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {JSON.parse(
          Array.isArray(question.options) ? JSON.stringify(question.options) : question.options as unknown as string
        ).map((option: string) => {
          const isSelected = selectedAnswer === option
          const isThisCorrect = option === question.correctAnswer

          return (
            <button
              key={option}
              onClick={() => handleAnswer(option)}
              disabled={showResult}
              className={clsx(
                'w-full text-left p-4 rounded-xl border-2 transition-all text-sm',
                !showResult && 'hover:border-primary-300 hover:bg-primary-50',
                !showResult && 'border-calm-200 bg-white',
                showResult && isThisCorrect && 'border-sage-400 bg-sage-50',
                showResult && isSelected && !isThisCorrect && 'border-red-400 bg-red-50',
                showResult && !isSelected && !isThisCorrect && 'border-calm-200 bg-calm-50 opacity-60'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {showResult && isThisCorrect ? (
                    <CheckCircle className="h-5 w-5 text-sage-500" />
                  ) : showResult && isSelected && !isThisCorrect ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <div
                      className={clsx(
                        'w-5 h-5 rounded-full border-2',
                        isSelected ? 'border-primary-500 bg-primary-500' : 'border-calm-300'
                      )}
                    />
                  )}
                </div>
                <span
                  className={clsx(
                    showResult && isThisCorrect && 'text-sage-800 font-medium',
                    showResult && isSelected && !isThisCorrect && 'text-red-800',
                    !showResult && 'text-slate-700'
                  )}
                >
                  {option}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {showResult && (
        <div
          className={clsx(
            'p-4 rounded-xl',
            isCorrect ? 'bg-sage-50 border border-sage-200' : 'bg-amber-50 border border-amber-200'
          )}
        >
          <p className={clsx('text-sm font-semibold mb-1', isCorrect ? 'text-sage-700' : 'text-amber-700')}>
            {isCorrect ? 'Correct!' : 'Not quite right'}
          </p>
          <p className={clsx('text-sm', isCorrect ? 'text-sage-600' : 'text-amber-600')}>
            {question.explanation}
          </p>
        </div>
      )}

      {showResult && (
        <button
          onClick={handleNext}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {currentQ + 1 < questions.length ? 'Next question' : 'See results'}
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
