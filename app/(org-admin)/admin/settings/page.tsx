'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Palette, Lock, User, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react'
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
]

export default function OrgAdminSettingsPage() {
  const { data: session } = useSession()
  const { colorTheme, setColorTheme } = useColorTheme()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwChanging, setPwChanging] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)

    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.')
      return
    }

    setPwChanging(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        setPwSuccess(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await res.json()
        setPwError(data.error || 'Failed to change password.')
      }
    } catch {
      setPwError('An unexpected error occurred.')
    } finally {
      setPwChanging(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account preferences.</p>
      </div>

      {/* Account info */}
      <div className="card space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Account</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Name</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{session?.user?.name || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Email</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">{session?.user?.email || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Role</p>
            <p className="font-medium text-slate-900 dark:text-slate-100">Organisation Admin</p>
          </div>
        </div>
      </div>

      {/* Colour theme */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Palette className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Colour Theme</h2>
        </div>
        <p className="text-sm text-slate-500">Choose the colour scheme for your sidebar and buttons.</p>
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map((theme) => {
            const active = colorTheme === theme.id
            return (
              <button
                key={theme.id}
                onClick={() => setColorTheme(theme.id)}
                className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                  active
                    ? 'border-primary-500 bg-primary-50'
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

      {/* Font & text size */}
      <FontSettings />

      {/* Change Password — only for users with a password */}
      {session?.user?.hasPassword !== false && (
        <div className="card space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Change Password</h2>
          </div>

          {pwSuccess && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-300 font-medium">Password changed successfully.</p>
            </div>
          )}

          {pwError && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{pwError}</p>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Current password
              </label>
              <div className="relative">
                <input
                  id="currentPassword"
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                New password
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={pwChanging || !currentPassword || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm font-bold hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Lock className="h-4 w-4" />
              {pwChanging ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
