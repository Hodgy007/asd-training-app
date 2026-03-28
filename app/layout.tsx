import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Ambitious about Autism — Caregiver Training & Observation Tool',
  description:
    'A training and observation platform for caregivers and early years practitioners to support early identification of autism patterns. Not a diagnostic tool.',
  keywords: ['autism', 'caregiver training', 'observation', 'early years', 'UK', 'Ambitious about Autism'],
  authors: [{ name: 'Ambitious about Autism' }],
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SessionProvider>
            <div className="min-h-screen flex flex-col">
              <div className="disclaimer-banner flex items-start gap-2" role="alert">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-white" />
                <p className="text-white">
                  <strong>Important:</strong> This tool supports observation and pattern recognition
                  only. It is not a diagnostic tool. Always discuss concerns with a qualified
                  healthcare professional such as your GP, health visitor, or SENCO.
                </p>
              </div>
              <div className="flex-1">{children}</div>
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
