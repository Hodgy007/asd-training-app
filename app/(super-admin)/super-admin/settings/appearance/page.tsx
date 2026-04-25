'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle, Palette } from 'lucide-react'
import { useColorTheme, type ColorTheme } from '@/components/providers/color-theme-provider'
import { FontSettings } from '@/components/ui/font-settings'

const THEMES: { id: ColorTheme; label: string; description: string; swatchBg: string; swatchAccent: string }[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Warm orange — the original colour scheme',
    swatchBg: '#fff4e6',
    swatchAccent: '#f5821f',
  },
  {
    id: 'blue',
    label: 'Blue',
    description: 'Cool blue — modern professional look',
    swatchBg: '#f0f7fd',
    swatchAccent: '#056bb0',
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Dark slate — matches dark mode appearance',
    swatchBg: '#1e293b',
    swatchAccent: '#94a3b8',
  },
]

export default function AppearanceSettingsPage() {
  const { colorTheme, setColorTheme } = useColorTheme()

  const cardCls =
    'bg-white dark:bg-slate-800 rounded-2xl border border-calm-200 dark:border-slate-700 p-6 shadow-sm space-y-5'

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-page-enter">
      <Link
        href="/super-admin/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Palette className="h-6 w-6 text-pink-500" />
          Appearance
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Colour theme and font settings.
        </p>
      </div>

      <div className={cardCls}>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Colour Theme</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Choose the colour scheme for your sidebar and buttons.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((theme) => {
            const active = colorTheme === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => setColorTheme(theme.id)}
                className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                  active
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-calm-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-slate-500'
                }`}
              >
                <div
                  className="h-10 w-full rounded-lg flex items-center justify-end pr-2"
                  style={{ backgroundColor: theme.swatchBg }}
                >
                  <div className="h-6 w-6 rounded-md" style={{ backgroundColor: theme.swatchAccent }} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{theme.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{theme.description}</p>
                </div>
                {active && (
                  <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500">
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <FontSettings />
    </div>
  )
}
