'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail } from 'lucide-react'

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmail />
    </Suspense>
  )
}

function CheckEmail() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  return (
    <div className="min-h-screen bg-orange-50 dark:bg-slate-900 flex items-center justify-center p-4 animate-page-enter">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-14 w-auto mx-auto mb-4" />
        </div>

        <div className="card border-t-4 border-t-warm-500 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 mx-auto mb-4">
            <Mail className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Check your email</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
            {email ? (
              <>We&apos;ve sent a sign-up link to <strong>{email}</strong>.</>
            ) : (
              <>We&apos;ve sent you a sign-up link.</>
            )}{' '}
            Click it to choose a password and sign in. The link expires in 24 hours.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Can&apos;t see it? Check your spam folder or try registering again with the same email.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
