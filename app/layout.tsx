import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { CaregiverDisclaimer } from '@/components/ui/caregiver-disclaimer'

export const metadata: Metadata = {
  title: 'Ambitious about Autism — Training & Observation Platform',
  description:
    'A training and observation platform for practitioners and early years professionals to support early identification of autism patterns. Not a diagnostic tool.',
  keywords: ['autism', 'practitioner training', 'observation', 'early years', 'UK', 'Ambitious about Autism'],
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
              <CaregiverDisclaimer />
              <div className="flex-1">{children}</div>
            </div>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
