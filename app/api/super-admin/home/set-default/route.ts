import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'

const SINGLETON_ID = 'singleton'

/**
 * Snapshot the currently published Home page (htmlContent + brief) into the
 * `default*` columns. Subsequent "Reset to default" calls restore from this
 * snapshot.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const current = await prisma.homePage.findUnique({ where: { id: SINGLETON_ID } })
  if (!current || !current.htmlContent.trim()) {
    return NextResponse.json(
      { error: 'There is no published Home page to save as the default. Save some content first.' },
      { status: 400 },
    )
  }

  const row = await prisma.homePage.update({
    where: { id: SINGLETON_ID },
    data: {
      defaultHtmlContent: current.htmlContent,
      defaultBrief: current.brief,
      defaultSetAt: new Date(),
      defaultSetBy: session.user.id,
    },
  })

  return NextResponse.json({
    hasDefault: true,
    defaultSetAt: row.defaultSetAt,
  })
}
