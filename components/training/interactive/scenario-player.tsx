'use client'

import { useState, useCallback } from 'react'
import { CheckCircle, XCircle, MinusCircle, RotateCcw } from 'lucide-react'
import { ScenarioData, ScenarioNode } from '@/types/interactive'
import { BlockInstructions } from './block-instructions'
import { BlockCompletionBadge } from './block-completion-badge'

interface ScenarioPlayerProps {
  title: string
  instructions: string
  data: ScenarioData
  completed: boolean
  onComplete: () => void
}

export function ScenarioPlayer({ title, instructions, data, completed, onComplete }: ScenarioPlayerProps) {
  const [currentNodeId, setCurrentNodeId] = useState(data.startNodeId)
  const [history, setHistory] = useState<string[]>([])
  const [hasReachedEnding, setHasReachedEnding] = useState(completed)

  const currentNode = data.nodes.find(n => n.id === currentNodeId)

  const handleChoice = useCallback((nextNodeId: string) => {
    setHistory(prev => [...prev, currentNodeId])
    setCurrentNodeId(nextNodeId)

    const nextNode = data.nodes.find(n => n.id === nextNodeId)
    if (nextNode?.isEnding && !hasReachedEnding) {
      setHasReachedEnding(true)
      onComplete()
    }
  }, [currentNodeId, data.nodes, hasReachedEnding, onComplete])

  const handleRestart = useCallback(() => {
    setCurrentNodeId(data.startNodeId)
    setHistory([])
  }, [data.startNodeId])

  const handleGoBack = useCallback(() => {
    if (history.length === 0) return
    const previousId = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setCurrentNodeId(previousId)
  }, [history])

  if (!currentNode) {
    return <div className="text-red-500 text-sm">Error: scenario node not found.</div>
  }

  const stepNumber = history.length + 1
  const endingIcon = currentNode.endingType === 'positive' ? CheckCircle
    : currentNode.endingType === 'negative' ? XCircle
    : MinusCircle
  const endingColor = currentNode.endingType === 'positive'
    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
    : currentNode.endingType === 'negative'
    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
    : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
  const EndingIcon = endingIcon

  return (
    <div className="my-6">
      <BlockInstructions title={title} instructions={instructions} />

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-calm-200 dark:border-slate-700 p-5">
        {/* Step indicator */}
        <div className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
          Step {stepNumber}
        </div>

        {/* Node image */}
        {currentNode.imageUrl && (
          <img
            src={currentNode.imageUrl}
            alt=""
            className="rounded-lg mb-4 max-h-64 object-contain w-full"
          />
        )}

        {/* Node text */}
        <p className="text-slate-900 dark:text-white text-base leading-relaxed mb-4">
          {currentNode.text}
        </p>

        {/* Ending feedback */}
        {currentNode.isEnding && (
          <div className={`rounded-lg border p-4 mb-4 ${endingColor}`} role="status" aria-live="polite">
            <div className="flex items-start gap-2">
              <EndingIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                {currentNode.feedback && (
                  <p className="text-sm font-medium">{currentNode.feedback}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Choices */}
        {currentNode.choices && currentNode.choices.length > 0 && (
          <div className="space-y-2" role="group" aria-label="Choose your response">
            {currentNode.choices.map(choice => (
              <button
                key={choice.id}
                onClick={() => handleChoice(choice.nextNodeId)}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-calm-200 dark:border-slate-600 bg-calm-50 dark:bg-slate-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-slate-900 dark:text-white text-sm font-medium transition-colors min-h-[48px] touch-manipulation"
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-calm-100 dark:border-slate-700">
          {history.length > 0 && (
            <button
              onClick={handleGoBack}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium"
            >
              &larr; Go back
            </button>
          )}
          {(currentNode.isEnding || history.length > 0) && (
            <button
              onClick={handleRestart}
              className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium ml-auto"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Start over
            </button>
          )}
        </div>
      </div>

      <BlockCompletionBadge completed={hasReachedEnding} />
    </div>
  )
}
