import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'
import { sanitizeHtml } from '@/lib/sanitize'

const SINGLETON_ID = 'singleton'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const row = await prisma.homePage.findUnique({ where: { id: SINGLETON_ID } })
  return NextResponse.json({
    htmlContent: row?.htmlContent ?? '',
    brief: row?.brief ?? '',
    updatedAt: row?.updatedAt ?? null,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.htmlContent !== 'string') {
    return NextResponse.json({ error: 'htmlContent is required' }, { status: 400 })
  }

  const cleanHtml = sanitizeHtml(body.htmlContent)
  const brief = typeof body.brief === 'string' ? body.brief : null

  const row = await prisma.homePage.upsert({
    where: { id: SINGLETON_ID },
    update: { htmlContent: cleanHtml, brief, updatedBy: session.user.id },
    create: { id: SINGLETON_ID, htmlContent: cleanHtml, brief, updatedBy: session.user.id },
  })

  return NextResponse.json({
    htmlContent: row.htmlContent,
    brief: row.brief,
    updatedAt: row.updatedAt,
  })
}
