import { AlertTriangle } from 'lucide-react'
import { DISCLAIMER_TEXT } from '@/lib/constants'

interface DisclaimerProps {
  variant?: 'banner' | 'card' | 'inline'
  className?: string
}

export function Disclaimer({ variant = 'card', className }: DisclaimerProps) {
  if (variant === 'banner') {
    return (
      <div className={`disclaimer-banner flex items-start gap-2 ${className || ''}`} role="alert">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> {DISCLAIMER_TEXT}
        </p>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <p className={`text-xs text-amber-700 ${className || ''}`}>
        <AlertTriangle className="h-3 w-3 inline mr-1" />
        {DISCLAIMER_TEXT}
      </p>
    )
  }

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 ${className || ''}`}
      role="note"
    >
      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800">{DISCLAIMER_TEXT}</p>
    </div>
  )
}
