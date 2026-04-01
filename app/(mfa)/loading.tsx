import { Loader2 } from 'lucide-react'

export default function MfaLoading() {
  return (
    <div className="min-h-screen bg-orange-50 dark:bg-slate-900 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
    </div>
  )
}
