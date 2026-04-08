import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { canManageChildOrg } from '@/lib/org-hierarchy'
import { LEAF_ROLES } from '@/types/index'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  active: z.boolean().optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  inheritSettings: z.boolean().optional(),
  allowedProgramIds: z.array(z.string()).optional(),
  allowedRoles: z
    .array(z.string())
    .optional()
    .refine(
      (roles) => !roles || roles.every((r) => (LEAF_ROLES as string[]).includes(r)),
      { message: 'allowedRoles must be a subset of leaf roles' }
    ),
  cvBuilderEnabled: z.boolean().optional(),
  careersAdvisorEnabled: z.boolean().optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orgId } = params

  const allowed = await canManageChildOrg(session, orgId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const school = await prisma.organisation.findUnique({
    where: { id: orgId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { users: true } },
    },
  })

  if (!school) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ school })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orgId } = params

  const allowed = await canManageChildOrg(session, orgId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = parsed.data

  // Prevent changing hierarchy fields
  if ('parentOrgId' in (body as Record<string, unknown>) || 'isParentOrg' in (body as Record<string, unknown>)) {
    return NextResponse.json({ error: 'Cannot modify parentOrgId or isParentOrg' }, { status: 400 })
  }

  // If slug changed, check uniqueness
  if (data.slug) {
    const existing = await prisma.organisation.findUnique({
      where: { slug: data.slug },
    })
    if (existing && existing.id !== orgId) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
    }
  }

  const school = await prisma.organisation.update({
    where: { id: orgId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.contactName !== undefined && { contactName: data.contactName }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
      ...(data.contactPhone !== undefined && { contactPhone: data.contactPhone }),
      ...(data.addressLine1 !== undefined && { addressLine1: data.addressLine1 }),
      ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.county !== undefined && { county: data.county }),
      ...(data.postcode !== undefined && { postcode: data.postcode }),
      ...(data.country !== undefined && { country: data.country }),
      ...(data.inheritSettings !== undefined && { inheritSettings: data.inheritSettings }),
      ...(data.allowedProgramIds !== undefined && { allowedProgramIds: data.allowedProgramIds }),
      ...(data.allowedRoles !== undefined && { allowedRoles: data.allowedRoles }),
      ...(data.cvBuilderEnabled !== undefined && { cvBuilderEnabled: data.cvBuilderEnabled }),
      ...(data.careersAdvisorEnabled !== undefined && { careersAdvisorEnabled: data.careersAdvisorEnabled }),
    },
  })

  return NextResponse.json({ school })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { orgId } = params

  const allowed = await canManageChildOrg(session, orgId)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check no users exist in the child org
  const userCount = await prisma.user.count({
    where: { organisationId: orgId },
  })
  if (userCount > 0) {
    return NextResponse.json(
      { error: 'Cannot delete organisation with existing users. Remove all users first.' },
      { status: 400 }
    )
  }

  await prisma.organisation.delete({ where: { id: orgId } })

  return NextResponse.json({ success: true })
}
