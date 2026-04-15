'use client'

import { Type, Minus, Plus } from 'lucide-react'
import { useAppFont, type AppFont, FONT_SIZE_MIN, FONT_SIZE_MAX, FONT_SIZE_STEP, FONT_SIZE_DEFAULT, type FontSize } from '@/components/providers/font-provider'
import { clsx } from 'clsx'

const FONTS: {
  id: AppFont
  label: string
  description: string
  preview: string
  style: React.CSSProperties
}[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Standard system font',
    preview: 'Aa',
    style: { fontFamily: 'Arial, Helvetica, sans-serif' },
  },
  {
    id: 'atkinson',
    label: 'Atkinson Hyperlegible',
    description: 'Distinct letterforms — reduces character confusion',
    preview: 'Aa',
    style: { fontFamily: "'Atkinson Hyperlegible', sans-serif" },
  },
  {
    id: 'lexend',
    label: 'Lexend',
    description: 'Reduces visual stress and crowding',
    preview: 'Aa',
    style: { fontFamily: "'Lexend', sans-serif" },
  },
  {
    id: 'opendyslexic',
    label: 'OpenDyslexic',
    description: 'Weighted bottoms prevent letter rotation',
    preview: 'Aa',
    style: { fontFamily: "'OpenDyslexic', sans-serif" },
  },
]

export function FontSettings() {
  const { appFont, fontSize, setAppFont, setFontSize } = useAppFont()

  const canDecrease = fontSize > FONT_SIZE_MIN
  const canIncrease = fontSize < FONT_SIZE_MAX

  function decrease() {
    if (canDecrease) setFontSize((fontSize - FONT_SIZE_STEP) as FontSize)
  }

  function increase() {
    if (canIncrease) setFontSize((fontSize + FONT_SIZE_STEP) as FontSize)
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3">
        <Type className="h-5 w-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Font &amp; Text Size</h2>
      </div>

      {/* Font picker */}
      <div>
        <p className="text-sm text-slate-500 mb-3">Choose a font that is easier for you to read.</p>
        <div className="grid grid-cols-2 gap-3">
          {FONTS.map((font) => {
            const active = appFont === font.id
            return (
              <button
                key={font.id}
                onClick={() => setAppFont(font.id)}
                className={clsx(
                  'relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all',
                  active
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-calm-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-slate-500',
                )}
              >
                {/* Preview sample */}
                <div
                  className="h-10 w-full rounded-lg bg-calm-100 dark:bg-slate-700 flex items-center justify-center"
                  style={font.style}
                >
                  <span className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                    {font.preview}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight">
                    {font.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                    {font.description}
                  </p>
                </div>
                {active && (
                  <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Font size scaler */}
      <div>
        <p className="text-sm text-slate-500 mb-3">Adjust the text size across the platform.</p>
        <div className="flex items-center gap-4">
          <button
            onClick={decrease}
            disabled={!canDecrease}
            aria-label="Decrease font size"
            className="flex items-center justify-center h-10 w-10 rounded-xl border-2 border-calm-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Minus className="h-4 w-4" />
          </button>

          <div className="flex-1 flex flex-col items-center gap-1">
            {/* Visual bar */}
            <div className="w-full flex items-end justify-between gap-1 h-8">
              {([90, 95, 100, 105, 110, 115, 120, 125, 130] as FontSize[]).map((step) => (
                <button
                  key={step}
                  onClick={() => setFontSize(step)}
                  aria-label={`Set font size to ${step}%`}
                  className={clsx(
                    'flex-1 rounded-sm transition-all',
                    fontSize === step
                      ? 'bg-primary-500'
                      : 'bg-calm-200 dark:bg-slate-600 hover:bg-primary-300 dark:hover:bg-primary-700',
                  )}
                  style={{ height: `${24 + ((step - 90) / 40) * 16}px` }}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {fontSize === FONT_SIZE_DEFAULT ? 'Default' : `${fontSize}%`}
            </span>
          </div>

          <button
            onClick={increase}
            disabled={!canIncrease}
            aria-label="Increase font size"
            className="flex items-center justify-center h-10 w-10 rounded-xl border-2 border-calm-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {fontSize !== FONT_SIZE_DEFAULT && (
          <button
            onClick={() => setFontSize(FONT_SIZE_DEFAULT)}
            className="mt-2 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline"
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  )
}
