'use client'

import { clsx } from 'clsx'

const COLLECTION_THEMES = [
  { key: 'orange', label: 'Orange', bg: '#FFEDD2', accent: '#F5821F' },
  { key: 'green',  label: 'Green',  bg: '#E0F6E5', accent: '#34B44A' },
  { key: 'blue',   label: 'Blue',   bg: '#DDEEF8', accent: '#056BB0' },
  { key: 'pink',   label: 'Pink',   bg: '#FCE3F2', accent: '#E13CAF' },
  { key: 'yellow', label: 'Yellow', bg: '#FFF3CC', accent: '#FCAF17' },
  { key: 'cyan',   label: 'Cyan',   bg: '#E0F4FB', accent: '#44C7EE' },
] as const

interface Props {
  value: string | null
  onChange: (key: string | null) => void
}

/**
 * 6-colour swatch + Auto picker for the LibraryCollection.themeKey field.
 * Mirrors the palette used by the learner library (`TILE_THEMES`).
 */
export function CollectionThemePicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="label">Tile colour on the learner library</label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
            value === null
              ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-200 dark:bg-primary-900/20 dark:text-primary-300'
              : 'border-calm-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-calm-50 dark:hover:bg-slate-700'
          )}
        >
          Auto
        </button>
        {COLLECTION_THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            title={t.label}
            className={clsx(
              'h-8 w-8 rounded-full transition-transform hover:scale-110',
              value === t.key
                ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white'
                : 'ring-1 ring-slate-200 dark:ring-slate-600'
            )}
            style={{ backgroundColor: t.bg, borderColor: t.accent }}
          >
            <span className="sr-only">{t.label}</span>
            <span
              className="block h-3 w-3 rounded-full mx-auto"
              style={{ backgroundColor: t.accent }}
            />
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        Auto cycles through the palette. Pick a colour to lock this collection&apos;s tile.
      </p>
    </div>
  )
}
