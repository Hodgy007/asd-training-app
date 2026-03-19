'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ClipboardList } from 'lucide-react'
import { BEHAVIOUR_LISTS, DOMAIN_OPTIONS, FREQUENCY_OPTIONS, CONTEXT_OPTIONS } from '@/lib/constants'
import type { Domain } from '@/types'

interface ObservationFormProps {
  childId: string
  childName: string
  onClose: () => void
}

export function ObservationForm({ childId, childName, onClose }: ObservationFormProps) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    date: today,
    domain: '' as Domain | '',
    behaviourType: '',
    customBehaviour: '',
    frequency: '',
    context: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const behaviourOptions =
    form.domain && BEHAVIOUR_LISTS[form.domain as keyof typeof BEHAVIOUR_LISTS]
      ? [...BEHAVIOUR_LISTS[form.domain as keyof typeof BEHAVIOUR_LISTS], 'Other (describe below)']
      : []

  const isCustom = form.behaviourType === 'Other (describe below)'

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'domain' ? { behaviourType: '', customBehaviour: '' } : {}),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const behaviourType = isCustom ? form.customBehaviour : form.behaviourType

    if (!behaviourType) {
      setError('Please specify the behaviour observed.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/children/${childId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          domain: form.domain,
          behaviourType,
          frequency: form.frequency,
          context: form.context,
          notes: form.notes,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to save observation.')
      } else {
        router.refresh()
        onClose()
      }
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-calm-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sage-100 rounded-xl flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-sage-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Log an observation</h2>
              <p className="text-xs text-slate-400">for {childName}</p>
            </div>
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
            <label htmlFor="date" className="label">
              Date of observation <span className="text-red-400">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              className="input"
              required
              max={today}
            />
          </div>

          <div>
            <label htmlFor="domain" className="label">
              Observation domain <span className="text-red-400">*</span>
            </label>
            <select
              id="domain"
              name="domain"
              value={form.domain}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select a domain...</option>
              {DOMAIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Which area of development does this behaviour relate to?
            </p>
          </div>

          {form.domain && (
            <div>
              <label htmlFor="behaviourType" className="label">
                Behaviour observed <span className="text-red-400">*</span>
              </label>
              <select
                id="behaviourType"
                name="behaviourType"
                value={form.behaviourType}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select a behaviour...</option>
                {behaviourOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isCustom && (
            <div>
              <label htmlFor="customBehaviour" className="label">
                Describe the behaviour <span className="text-red-400">*</span>
              </label>
              <input
                id="customBehaviour"
                name="customBehaviour"
                type="text"
                value={form.customBehaviour}
                onChange={handleChange}
                className="input"
                placeholder="Describe what you observed..."
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="frequency" className="label">
              How often does this occur? <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    form.frequency === opt.value
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-calm-200 hover:border-calm-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="frequency"
                    value={opt.value}
                    checked={form.frequency === opt.value}
                    onChange={handleChange}
                    className="mt-0.5"
                    required
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                    <p className="text-xs text-slate-400">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="context" className="label">
              Where was this observed? <span className="text-red-400">*</span>
            </label>
            <select
              id="context"
              name="context"
              value={form.context}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select context...</option>
              {CONTEXT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes" className="label">
              Additional notes{' '}
              <span className="text-slate-400 text-xs font-normal">(optional)</span>
            </label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="input min-h-[80px] resize-none"
              placeholder="What happened before or after? What was the trigger? How long did it last?"
            />
          </div>

          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-xs text-amber-700">
              Record only what you observe — describe the behaviour, not what it might mean. Avoid
              diagnostic language.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-sage flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save observation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
