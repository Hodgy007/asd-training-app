'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { AlertTriangle, Trash2, Shield, User, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [pwChanging, setPwChanging] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const isAdmin = session?.user?.role === 'SUPER_ADMIN'

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

  async function handleDeleteAccount() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch('/api/account', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete account.')
        return
      }
      await signOut({ callbackUrl: '/login' })
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and data.</p>
      </div>

      {/* Account info */}
      <div className="card space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Your Account</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Name</p>
            <p className="font-medium text-slate-900">{session?.user?.name || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Email</p>
            <p className="font-medium text-slate-900">{session?.user?.email || '—'}</p>
          </div>
          <div>
            <p className="text-slate-400">Role</p>
            <p className="font-medium text-slate-900">
              {session?.user?.role === 'SUPER_ADMIN'
                ? 'Administrator'
                : session?.user?.role === 'CAREER_DEV_OFFICER'
                ? 'Careers Professional'
                : 'Practitioner'}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password */}
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

      {/* Data & Privacy */}
      <div className="card space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Data & Privacy</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your data is stored securely on Neon PostgreSQL (hosted on Azure, EU). We store your name,
          email{session?.user?.role === 'CAREGIVER' ? ', child profiles, and observations' : ', and training progress'}. No data is sold or shared with third parties{session?.user?.role === 'CAREGIVER' ? ' except Google Gemini for AI report generation (observation data only, no retention by Google)' : ''}.
        </p>
        <p className="text-sm text-slate-600">
          Under UK GDPR you have the right to access, correct, and erase your data. To request a
          copy of your data, contact{' '}
          <a href="mailto:privacy@ambitiousaboutautism.org.uk" className="text-primary-600 underline">
            privacy@ambitiousaboutautism.org.uk
          </a>
          .
        </p>
      </div>

      {/* Danger zone */}
      <div className="card border-2 border-red-200 space-y-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-700">Danger Zone</h2>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Delete my account</h3>
          <p className="text-sm text-slate-500 mt-1">
            Permanently deletes your account and all associated data{session?.user?.role === 'CAREGIVER' ? ' including child profiles, observations, AI insights, and' : ' including'} training progress. <strong>This cannot be undone.</strong>
          </p>
        </div>

        {isAdmin ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-800">
              Admin accounts cannot be self-deleted. Ask another administrator to remove your account
              via the admin panel.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Type <span className="font-mono bg-slate-100 px-1 rounded">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input"
                placeholder="DELETE"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={handleDeleteAccount}
              disabled={confirmText !== 'DELETE' || deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting…' : 'Delete my account and all data'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
