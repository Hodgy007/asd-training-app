'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

interface PillSelectorProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  allowOther?: boolean
  otherValue?: string
  onOtherChange?: (value: string) => void
  maxSelect?: number
  singleSelect?: boolean
}

export function PillSelector({
  options,
  selected,
  onChange,
  allowOther,
  otherValue = '',
  onOtherChange,
  maxSelect,
  singleSelect,
}: PillSelectorProps) {
  const [showOtherInput, setShowOtherInput] = useState(!!otherValue)

  function handleToggle(option: string) {
    if (singleSelect) {
      onChange([option])
      return
    }

    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option))
    } else {
      if (maxSelect && selected.length >= maxSelect) return
      onChange([...selected, option])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option)
          const isDisabled = !isSelected && !!maxSelect && selected.length >= maxSelect

          return (
            <button
              key={option}
              type="button"
              onClick={() => handleToggle(option)}
              disabled={isDisabled}
              className={clsx(
                'px-4 py-2 rounded-full text-sm font-medium transition-all border-2',
                isSelected
                  ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-primary-900/40 dark:border-primary-400 dark:text-primary-300'
                  : isDisabled
                  ? 'bg-calm-50 border-calm-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600'
                  : 'bg-white border-calm-200 text-slate-700 hover:border-primary-300 hover:bg-primary-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:bg-primary-900/20'
              )}
            >
              {option}
            </button>
          )
        })}

        {allowOther && (
          <button
            type="button"
            onClick={() => setShowOtherInput(!showOtherInput)}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-all border-2 border-dashed',
              showOtherInput
                ? 'bg-primary-50 border-primary-400 text-primary-600 dark:bg-primary-900/30 dark:border-primary-500 dark:text-primary-400'
                : 'bg-white border-calm-300 text-slate-500 hover:border-primary-300 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400'
            )}
          >
            + Other
          </button>
        )}
      </div>

      {allowOther && showOtherInput && (
        <input
          type="text"
          value={otherValue}
          onChange={(e) => onOtherChange?.(e.target.value)}
          placeholder="Type your own answer..."
          className="w-full max-w-md px-4 py-2 border border-calm-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
      )}

      {maxSelect && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Pick up to {maxSelect} ({selected.length}/{maxSelect} selected)
        </p>
      )}
    </div>
  )
}
