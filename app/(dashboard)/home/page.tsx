import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { sanitizeHtml } from '@/lib/sanitize'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const row = await prisma.homePage.findUnique({ where: { id: 'singleton' } })
  const html = row?.htmlContent ? sanitizeHtml(row.htmlContent) : ''

  if (!html) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          Welcome
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          The Home page hasn&apos;t been set up yet.
        </p>
        {isSuperAdmin(session) && (
          <Link
            href="/super-admin/home"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600"
          >
            Set up the Home page
          </Link>
        )}
      </div>
    )
  }

  return (
    <div
      className="home-content max-w-6xl mx-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
