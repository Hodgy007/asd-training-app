import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'
import {
  EDITABLE_HOMEPAGE_ROLES,
  homeBlocksSchema,
  isEditableHomepageRole,
  type EditableHomepageRole,
} from '@/lib/home-blocks'

function parseRoleParam(req: NextRequest): EditableHomepageRole | null {
  const role = req.nextUrl.searchParams.get('role')
  return role && isEditableHomepageRole(role) ? role : null
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const role = parseRoleParam(req)
  if (!role) {
    return NextResponse.json({ error: 'Invalid role', validRoles: EDITABLE_HOMEPAGE_ROLES }, { status: 400 })
  }

  const row = await prisma.homePage.findUnique({ where: { role } })
  return NextResponse.json({
    role,
    blocks: row?.blocks ?? [],
    updatedAt: row?.updatedAt ?? null,
  })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const role = parseRoleParam(req)
  if (!role) {
    return NextResponse.json({ error: 'Invalid role', validRoles: EDITABLE_HOMEPAGE_ROLES }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const parsed = homeBlocksSchema.safeParse(body?.blocks)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid blocks', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const row = await prisma.homePage.upsert({
    where: { role },
    update: { blocks: parsed.data, updatedBy: session.user.id },
    create: { role, blocks: parsed.data, updatedBy: session.user.id },
  })

  return NextResponse.json({
    role: row.role,
    blocks: row.blocks,
    updatedAt: row.updatedAt,
  })
}
