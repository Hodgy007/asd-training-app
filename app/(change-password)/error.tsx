'use client'

import { AlertCircle } from 'lucide-react'

export default function ChangePasswordError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-orange-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="card border-t-4 border-t-red-500 p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-6">
            An error occurred. Please try again.
          </p>
          <button onClick={reset} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
