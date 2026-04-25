import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'

const SINGLETON_ID = 'singleton'

/**
 * Restore the published Home page (htmlContent + brief) from the `default*`
 * snapshot. Leaves the snapshot itself untouched so further resets work.
 */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const current = await prisma.homePage.findUnique({ where: { id: SINGLETON_ID } })
  if (!current?.defaultHtmlContent) {
    return NextResponse.json(
      { error: 'No default has been captured yet. Click "Make this the default" first.' },
      { status: 400 },
    )
  }

  const row = await prisma.homePage.update({
    where: { id: SINGLETON_ID },
    data: {
      htmlContent: current.defaultHtmlContent,
      brief: current.defaultBrief,
      updatedBy: session.user.id,
    },
  })

  return NextResponse.json({
    htmlContent: row.htmlContent,
    brief: row.brief,
    updatedAt: row.updatedAt,
  })
}
