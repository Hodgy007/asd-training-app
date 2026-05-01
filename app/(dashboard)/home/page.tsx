import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { homeBlocksSchema, isEditableHomepageRole, type HomeBlock } from '@/lib/home-blocks'
import { HomeBlocksRenderer } from '@/components/home/home-blocks'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  const canEdit = isSuperAdmin(session)

  let blocks: HomeBlock[] = []
  if (role && isEditableHomepageRole(role)) {
    const row = await prisma.homePage.findUnique({ where: { role } })
    if (row?.blocks) {
      const parsed = homeBlocksSchema.safeParse(row.blocks)
      if (parsed.success) blocks = parsed.data
    }
  }

  return (
    <div className="max-w-6xl mx-auto relative">
      {canEdit && (
        <Link
          href="/super-admin/home"
          className="absolute right-0 top-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Link>
      )}

      <header className="flex items-center justify-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-aaa.svg" alt="Ambitious about Autism" className="h-20 w-auto" />
      </header>

      {blocks.length > 0 ? (
        <HomeBlocksRenderer blocks={blocks} />
      ) : (
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">Welcome</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {role && isEditableHomepageRole(role)
              ? "The Home page hasn't been set up for your role yet."
              : 'There is no Home page configured for your role.'}
          </p>
          {canEdit && (
            <Link
              href="/super-admin/home"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600"
            >
              Set up the Home page
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
