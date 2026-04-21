import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/providers/session-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { ColorThemeProvider } from '@/components/providers/color-theme-provider'
import { FontProvider } from '@/components/providers/font-provider'
import { CookieConsent } from '@/components/ui/cookie-consent'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Ambitious about Autism — Training Platform',
  description:
    'A training platform for careers professionals, students, interns and employees supporting autistic learners.',
  keywords: ['autism', 'careers training', 'UK', 'Ambitious about Autism'],
  authors: [{ name: 'Ambitious about Autism' }],
  robots: 'noindex, nofollow',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Apply saved colour theme before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('aaa-color-theme');if(t==='blue'||t==='dark')document.documentElement.setAttribute('data-color-theme',t);var f=localStorage.getItem('aaa-font');if(f&&f!=='default')document.documentElement.setAttribute('data-font',f);var s=localStorage.getItem('aaa-font-size');if(s){var n=parseInt(s,10);if(n>=90&&n<=130)document.documentElement.style.fontSize=n+'%';}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ColorThemeProvider>
          <FontProvider>
          <SessionProvider>
            <div className="min-h-screen flex flex-col">
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
