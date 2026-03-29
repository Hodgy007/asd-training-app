'use client'

import { useSession } from 'next-auth/react'
import { AlertTriangle } from 'lucide-react'

export function CaregiverDisclaimer() {
  const { data: session } = useSession()

  if (session?.user?.role !== 'CAREGIVER') return null

  return (
    <div className="disclaimer-banner flex items-start gap-2" role="alert">
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-white" />
      <p className="text-white">
        <strong>Important:</strong> This tool supports observation and pattern recognition
        only. It is not a diagnostic tool. Always discuss concerns with a qualified
        healthcare professional such as your GP, health visitor, or SENCO.
      </p>
    </div>
  )
}
