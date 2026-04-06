'use client'

import { CheckCircle } from 'lucide-react'

interface BlockCompletionBadgeProps {
  completed: boolean
}

export function BlockCompletionBadge({ completed }: BlockCompletionBadgeProps) {
  if (!completed) return null
  return (
    <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700 dark:text-green-400 mt-3 motion-safe:animate-in motion-safe:fade-in">
      <CheckCircle className="h-4 w-4" />
      Completed
    </div>
  )
}
