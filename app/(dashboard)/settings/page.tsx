'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { AlertTriangle, Trash2, Shield, User } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = session?.user?.role === 'SUPER_ADMIN'

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
