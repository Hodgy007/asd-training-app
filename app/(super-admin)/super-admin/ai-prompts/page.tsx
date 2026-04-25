import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import Link from 'next/link'
import { Sparkles, FileText, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const CATEGORY_LABEL: Record<string, string> = {
  cv: 'CV Builder',
  careers: 'Careers Advisor',
  survey: 'Surveys',
  training: 'Training',
  library: 'Document Library',
  home: 'Home Page',
}

export default async function AiPromptsListPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!hasPermission(session, CHARITY_PERMISSIONS.MANAGE_AI_PROMPTS)) {
    redirect('/super-admin')
  }

  const prompts = await prisma.aiPrompt.findMany({
    select: {
      id: true,
      key: true,
      name: true,
      purpose: true,
      category: true,
      model: true,
      enabled: true,
      updatedAt: true,
      updatedByUser: { select: { name: true, email: true } },
      _count: { select: { contextFiles: true } },
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  })

  const byCategory: Record<string, typeof prompts> = {}
  for (const p of prompts) {
    if (!byCategory[p.category]) byCategory[p.category] = []
    byCategory[p.category]!.push(p)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-page-enter">
      <div className="flex items-center gap-3">
        <Sparkles className="h-7 w-7 text-primary-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">AI Prompts</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tune the AI behaviours across the app. Changes apply to the next call.
          </p>
        </div>
      </div>

      {Object.entries(byCategory).map(([cat, items]) => (
        <section key={cat} className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {CATEGORY_LABEL[cat] ?? cat}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/super-admin/ai-prompts/${p.id}`}
                className="card hover:border-primary-300 transition-colors flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {p.name}
                  </h3>
                  <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-1" />
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{p.purpose}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full font-medium',
                      p.enabled
                        ? 'bg-sage-100 text-sage-700 dark:bg-sage-900/40 dark:text-sage-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
                    )}
                  >
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-medium">
                    {p.model}
                  </span>
                  {p._count.contextFiles > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
                      <FileText className="h-3 w-3" />
                      {p._count.contextFiles} file{p._count.contextFiles === 1 ? '' : 's'}
                    </span>
                  )}
                  <span className="text-slate-400 ml-auto">
                    {p.updatedByUser
                      ? `${p.updatedByUser.name ?? p.updatedByUser.email} · ${formatDistanceToNow(p.updatedAt, { addSuffix: true })}`
                      : 'Never edited'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
