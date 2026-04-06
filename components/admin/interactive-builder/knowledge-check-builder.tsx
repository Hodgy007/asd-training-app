'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { InteractiveBlock, KnowledgeCheckData, KnowledgeCheckQuestion } from '@/types/interactive'

interface KnowledgeCheckBuilderProps {
  block: InteractiveBlock
  onChange: (updated: InteractiveBlock) => void
}

function generateId() {
  return 'kc-' + Math.random().toString(36).slice(2, 7)
}

const MAX_QUESTIONS = 3
const MIN_OPTIONS = 2
const MAX_OPTIONS = 4

export function KnowledgeCheckBuilder({ block, onChange }: KnowledgeCheckBuilderProps) {
  const data = block.data as KnowledgeCheckData
  const [titleEdit, setTitleEdit] = useState(block.title)
  const [instructionsEdit, setInstructionsEdit] = useState(block.instructions)

  function updateData(updated: KnowledgeCheckData) {
    onChange({ ...block, data: updated })
  }

  function updateQuestion(questionId: string, updated: KnowledgeCheckQuestion) {
    const questions = data.questions.map(q => (q.id === questionId ? updated : q))
    updateData({ ...data, questions })
  }

  function addQuestion() {
    if (data.questions.length >= MAX_QUESTIONS) return
    const newQuestion: KnowledgeCheckQuestion = {
      id: generateId(),
      question: '',
      options: ['', ''],
      correctAnswer: '',
      feedback: '',
    }
    updateData({ ...data, questions: [...data.questions, newQuestion] })
  }

  function deleteQuestion(questionId: string) {
    const questions = data.questions.filter(q => q.id !== questionId)
    updateData({ ...data, questions })
  }

  function addOption(question: KnowledgeCheckQuestion) {
    if (question.options.length >= MAX_OPTIONS) return
    updateQuestion(question.id, {
      ...question,
      options: [...question.options, ''],
    })
  }

  function removeOption(question: KnowledgeCheckQuestion, optionIndex: number) {
    if (question.options.length <= MIN_OPTIONS) return
    const removed = question.options[optionIndex]
    const newOptions = question.options.filter((_, i) => i !== optionIndex)
    updateQuestion(question.id, {
      ...question,
      options: newOptions,
      // Clear correct answer if the removed option was the correct one
      correctAnswer: question.correctAnswer === removed ? '' : question.correctAnswer,
    })
  }

  function updateOptionText(question: KnowledgeCheckQuestion, optionIndex: number, text: string) {
    const oldText = question.options[optionIndex]
    const newOptions = question.options.map((o, i) => (i === optionIndex ? text : o))
    updateQuestion(question.id, {
      ...question,
      options: newOptions,
      // Keep correct answer in sync if we edited the correct option
      correctAnswer: question.correctAnswer === oldText ? text : question.correctAnswer,
    })
  }

  const inputClass =
    'w-full rounded-lg border border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white'

  return (
    <div className="space-y-4">
      {/* Block metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Title
          </label>
          <input
            type="text"
            value={titleEdit}
            onChange={e => {
              setTitleEdit(e.target.value)
              onChange({ ...block, title: e.target.value })
            }}
            className={inputClass}
            placeholder="e.g. Quick check: Early signs"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Instructions
          </label>
          <input
            type="text"
            value={instructionsEdit}
            onChange={e => {
              setInstructionsEdit(e.target.value)
              onChange({ ...block, instructions: e.target.value })
            }}
            className={inputClass}
            placeholder="Answer each question to check your understanding."
          />
        </div>
      </div>

      {/* Questions */}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">
          Questions ({data.questions.length}/{MAX_QUESTIONS})
        </label>

        <div className="space-y-4">
          {data.questions.map((question, qIdx) => (
            <div
              key={question.id}
              className="border border-slate-200 dark:border-slate-600 rounded-lg p-4 bg-white dark:bg-slate-800 space-y-3"
            >
              {/* Question header */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                  Q{qIdx + 1}
                </span>
                <button
                  onClick={() => deleteQuestion(question.id)}
                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                  title="Delete question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Question text */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Question
                </label>
                <textarea
                  value={question.question}
                  onChange={e =>
                    updateQuestion(question.id, { ...question, question: e.target.value })
                  }
                  rows={2}
                  className={inputClass}
                  placeholder="Enter the question text..."
                />
              </div>

              {/* Options */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Options (select the correct answer)
                </label>
                <div className="space-y-2">
                  {question.options.map((option, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={question.correctAnswer === option && option !== ''}
                        onChange={() =>
                          updateQuestion(question.id, { ...question, correctAnswer: option })
                        }
                        className="h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 focus:ring-primary-500"
                        title={`Mark option ${optIdx + 1} as correct`}
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={e => updateOptionText(question, optIdx, e.target.value)}
                        className={`flex-1 ${inputClass}`}
                        placeholder={`Option ${optIdx + 1}`}
                      />
                      {question.options.length > MIN_OPTIONS && (
                        <button
                          onClick={() => removeOption(question, optIdx)}
                          className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1"
                          title="Remove option"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {question.options.length < MAX_OPTIONS && (
                  <button
                    onClick={() => addOption(question)}
                    className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-medium mt-2 hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Add option
                  </button>
                )}
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Feedback (shown on correct answer)
                </label>
                <textarea
                  value={question.feedback}
                  onChange={e =>
                    updateQuestion(question.id, { ...question, feedback: e.target.value })
                  }
                  rows={2}
                  className={inputClass}
                  placeholder="Explain why this is the correct answer..."
                />
              </div>
            </div>
          ))}
        </div>

        {data.questions.length < MAX_QUESTIONS && (
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 font-medium mt-3 hover:underline"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
        )}
      </div>
    </div>
  )
}
