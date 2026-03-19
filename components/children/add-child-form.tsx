'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, UserPlus } from 'lucide-react'

interface AddChildFormProps {
  onClose: () => void
}

export function AddChildForm({ onClose }: AddChildFormProps) {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', dateOfBirth: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to add child.')
      } else {
        router.refresh()
        onClose()
        router.push(`/children/${data.id}`)
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  // Max date is today (no future dates), min is 15 years ago
  const today = new Date().toISOString().split('T')[0]
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 15)
  const minDateStr = minDate.toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-calm-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Add a child</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-calm-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="label">
              Child&apos;s first name <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              className="input"
              placeholder="e.g. Jamie"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              You can use a nickname or first name only for privacy.
            </p>
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="label">
              Date of birth <span className="text-red-400">*</span>
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
              className="input"
              required
              max={today}
              min={minDateStr}
            />
          </div>

          <div>
            <label htmlFor="notes" className="label">
              Notes <span className="text-slate-400 text-xs font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input min-h-[80px] resize-none"
              placeholder="Any relevant background information, e.g. premature birth, other diagnoses, family history..."
            />
          </div>

          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              Data is stored securely and associated with your account only. Do not enter full names
              or identifying details if you prefer anonymity.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </span>
              ) : (
                'Add child'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
