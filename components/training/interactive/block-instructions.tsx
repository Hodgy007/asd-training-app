'use client'

import { Info } from 'lucide-react'

interface BlockInstructionsProps {
  title: string
  instructions: string
}

export function BlockInstructions({ title, instructions }: BlockInstructionsProps) {
  return (
    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl p-4 mb-4">
      <h3 className="font-bold text-primary-800 dark:text-primary-200 text-lg mb-1 flex items-center gap-2">
        <Info className="h-5 w-5 flex-shrink-0" />
        {title}
      </h3>
      {instructions && (
        <p className="text-sm text-primary-700 dark:text-primary-300">{instructions}</p>
      )}
    </div>
  )
}
