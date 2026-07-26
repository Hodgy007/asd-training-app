import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSuperAdmin } from '@/lib/rbac'
import { homeBlocksSchema } from '@/lib/home-blocks'
import { loadHomePageForEdit, saveHomePage, deleteOrgHomePage } from '@/lib/homepage'

/**
 * Homepage editing, scoped per organisation.
 *
 * No `?orgId=` targets the platform default, which every organisation without
 * its own page falls back to. `?orgId=<id>` targets that organisation's
 * override. Charity admins manage both; org admins do not edit their own —
 * homepage content stays under central control.
 */

/**
 * Resolve the target org from the query string: `{ orgId: null }` for the
 * default, or an error response when the id doesn't exist.
 */
async function resolveTarget(
  req: NextRequest
): Promise<{ orgId: string | null } | { error: NextResponse }> {
  const raw = req.nextUrl.searchParams.get('orgId')
  if (!raw) return { orgId: null }

  const org = await prisma.organisation.findUnique({
    where: { id: raw },
    select: { id: true },
  })
  if (!org) {
    return { error: NextResponse.json({ error: 'Organisation not found' }, { status: 404 }) }
  }
  return { orgId: org.id }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const target = await resolveTarget(req)
  if ('error' in target) return target.error

  const { blocks, updatedAt } = await loadHomePageForEdit(target.orgId)
  return NextResponse.json({ organisationId: target.orgId, blocks, updatedAt })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const target = await resolveTarget(req)
  if ('error' in target) return target.error

  const body = await req.json().catch(() => null)
  const parsed = homeBlocksSchema.safeParse(body?.blocks)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid blocks', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { updatedAt } = await saveHomePage(target.orgId, parsed.data, session.user.id)
  return NextResponse.json({ organisationId: target.orgId, blocks: parsed.data, updatedAt })
}

/**
 * Remove an organisation's override so its members fall back to the default.
 * The default itself cannot be deleted — clear its blocks instead.
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const target = await resolveTarget(req)
  if ('error' in target) return target.error
  if (target.orgId === null) {
    return NextResponse.json(
      { error: 'The default homepage cannot be deleted. Clear its blocks instead.' },
      { status: 400 },
    )
  }

  await deleteOrgHomePage(target.orgId)
  return NextResponse.json({ ok: true })
}
