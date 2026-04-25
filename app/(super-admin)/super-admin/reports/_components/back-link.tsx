import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function BackToReports() {
  return (
    <Link
      href="/super-admin/reports"
      className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Reports
    </Link>
  )
}
