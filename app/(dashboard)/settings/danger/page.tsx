'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { SettingsSubpage } from '@/components/settings/subpage'

export default function SettingsDangerPage() {
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
    <SettingsSubpage
      title="Danger Zone"
      description="Permanently delete your account and all associated data."
      icon={AlertTriangle}
      iconColor="text-red-600 dark:text-red-400"
      iconBg="bg-red-50 dark:bg-red-900/20"
    >
      <div className="card border-2 border-red-200 dark:border-red-900/40 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Delete my account</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Permanently deletes your account and all associated data including training progress.{' '}
            <strong>This cannot be undone.</strong>
          </p>
        </div>

        {isAdmin ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Admin accounts cannot be self-deleted. Ask another administrator to remove your account
              via the admin panel.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">
                Type <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input"
                placeholder="DELETE"
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
    </SettingsSubpage>
  )
}
