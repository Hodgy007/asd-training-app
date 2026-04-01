'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'

export default function SuperAdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="card max-w-md w-full text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-6">
          An unexpected error occurred. Please try again or check the system logs.
        </p>
        <button onClick={reset} className="btn-primary inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    </div>
  )
}
