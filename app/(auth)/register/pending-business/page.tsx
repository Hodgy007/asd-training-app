import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'

export default function PendingBusinessPage() {
  return (
    <div className="min-h-screen bg-orange-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-28 w-auto mx-auto mb-4" />
        </div>

        <div className="card border-t-4 border-t-sage-500 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-sage-100 dark:bg-sage-900/30 rounded-full mx-auto">
            <CheckCircle className="h-7 w-7 text-sage-600 dark:text-sage-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Your business is awaiting approval
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Thanks for registering. A charity admin will review your application and email you once
            your business is approved. You&apos;ll then be able to sign in as the first administrator.
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
