import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ColorThemeProvider } from '@/components/providers/color-theme-provider'
import { FontProvider } from '@/components/providers/font-provider'
import { CaregiverDisclaimer } from '@/components/ui/caregiver-disclaimer'
import { CookieConsent } from '@/components/ui/cookie-consent'

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
      <head>
        {/* Apply saved colour theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('aaa-color-theme');if(t==='blue')document.documentElement.setAttribute('data-color-theme','blue');var f=localStorage.getItem('aaa-font');if(f&&f!=='default')document.documentElement.setAttribute('data-font',f);var s=localStorage.getItem('aaa-font-size');if(s){var n=parseInt(s,10);if(n>=90&&n<=130)document.documentElement.style.fontSize=n+'%';}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ColorThemeProvider>
          <FontProvider>
          <SessionProvider>
            <div className="min-h-screen flex flex-col">
              <CaregiverDisclaimer />
              <div className="flex-1">{children}</div>
            </div>
          </SessionProvider>
          <CookieConsent />
          </FontProvider>
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
