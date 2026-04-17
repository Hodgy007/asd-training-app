'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle, ChevronDown, Building2, ArrowLeft } from 'lucide-react'

const ORG_TYPE_OPTIONS = [
  { value: 'SCHOOL', label: 'School' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'ACADEMY', label: 'Academy' },
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'EMPLOYER', label: 'Employer' },
]

export default function RegisterOrganisationPage() {
  const [name, setName] = useState('')
  const [organisationType, setOrganisationType] = useState('SCHOOL')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [county, setCounty] = useState('')
  const [postcode, setPostcode] = useState('')
  const [country, setCountry] = useState('United Kingdom')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/organisations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          organisationType,
          contactName,
          contactEmail,
          contactPhone: contactPhone || undefined,
          addressLine1: addressLine1 || undefined,
          addressLine2: addressLine2 || undefined,
          city: city || undefined,
          county: county || undefined,
          postcode: postcode || undefined,
          country: country || undefined,
        }),
      })

      if (res.ok) {
        setSuccess(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Registration failed. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-orange-50 dark:bg-slate-900 flex items-center justify-center p-4 animate-page-enter">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-28 w-auto mx-auto mb-4" />
            </div>

          <div className="card border-t-4 border-t-sage-500 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-sage-100 dark:bg-sage-900/30 rounded-full mx-auto">
              <CheckCircle className="h-7 w-7 text-sage-600 dark:text-sage-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registration Submitted</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Thank you for registering <strong>{name}</strong>. Your application will be reviewed by a charity admin. You will be contacted at <strong>{contactEmail}</strong> once approved.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-slate-900 flex items-center justify-center p-4 animate-page-enter">
      <div className="w-full max-w-lg">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-14 w-auto mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 mt-1">Training &amp; Observation Platform</p>
        </div>

        {/* Registration Card */}
        <div className="card border-t-4 border-t-primary-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Register your organisation</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Submit your details for charity admin approval.</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-5">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Organisation Details */}
            <div>
              <label htmlFor="org-name" className="label">Organisation Name <span className="text-red-500">*</span></label>
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                placeholder="e.g. Sunrise Academy"
                required
              />
            </div>

            <div>
              <label htmlFor="org-type" className="label">Organisation Type <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  id="org-type"
                  value={organisationType}
                  onChange={(e) => setOrganisationType(e.target.value)}
                  className="input w-full appearance-none pr-8"
                  required
                >
                  {ORG_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Primary Contact */}
            <div className="pt-2 border-t border-calm-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Primary Contact</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="label">Full Name <span className="text-red-500">*</span></label>
                  <input
                    id="contact-name"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. Jane Smith"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="label">Email <span className="text-red-500">*</span></label>
                  <input
                    id="contact-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. jane@sunrise-academy.co.uk"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="label">Phone</label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="input w-full"
                    placeholder="e.g. 07700 123456"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="pt-2 border-t border-calm-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Address</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="addr1" className="label">Address Line 1</label>
                  <input id="addr1" type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="input w-full" placeholder="e.g. 10 High Street" />
                </div>
                <div>
                  <label htmlFor="addr2" className="label">Address Line 2</label>
                  <input id="addr2" type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className="input w-full" placeholder="Optional" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="label">City / Town</label>
                    <input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} className="input w-full" placeholder="e.g. London" />
                  </div>
                  <div>
                    <label htmlFor="county" className="label">County</label>
                    <input id="county" type="text" value={county} onChange={(e) => setCounty(e.target.value)} className="input w-full" placeholder="e.g. Hertfordshire" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="postcode" className="label">Postcode</label>
                    <input id="postcode" type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} className="input w-full" placeholder="e.g. AL5 2QP" />
                  </div>
                  <div>
                    <label htmlFor="country" className="label">Country</label>
                    <input id="country" type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="input w-full" />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-2.5 text-base"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Registration'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-calm-200 dark:border-slate-700 text-center">
            <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
              Already have an account? Sign in
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          Ambitious about Autism &mdash; Registered Charity &middot; Not a diagnostic tool
        </p>
      </div>
    </div>
  )
}
