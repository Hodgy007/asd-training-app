import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { LEAF_ROLES } from '@/types/index'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  organisationType: z.enum(['SCHOOL', 'COLLEGE', 'ACADEMY', 'UNIVERSITY', 'EMPLOYER', 'EDUCATION', 'BUSINESS']).optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  inheritSettings: z.boolean().default(true),
  allowedProgramIds: z.array(z.string()).optional(),
  allowedRoles: z
    .array(z.string())
    .optional()
    .refine(
      (roles) => !roles || roles.every((r) => (LEAF_ROLES as string[]).includes(r)),
      { message: 'allowedRoles must be a subset of leaf roles' }
    ),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  // Verify this org is a parent org
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { isParentOrg: true },
  })
  if (!org?.isParentOrg) {
    return NextResponse.json({ error: 'Not a parent organisation' }, { status: 403 })
  }

  const schools = await prisma.organisation.findMany({
    where: { parentOrgId: orgId },
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ schools })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const orgId = session.user.organisationId
  if (!orgId) return NextResponse.json({ error: 'No organisation' }, { status: 400 })

  // Verify this org is a parent org
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { isParentOrg: true },
  })
  if (!org?.isParentOrg) {
    return NextResponse.json({ error: 'Not a parent organisation' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = parsed.data

  // Check slug uniqueness globally
  const existing = await prisma.organisation.findUnique({
    where: { slug: data.slug },
  })
  if (existing) {
    return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
  }

  const school = await prisma.organisation.create({
    data: {
      name: data.name,
      slug: data.slug,
      organisationType: data.organisationType as never,
      contactName: data.contactName,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      city: data.city,
      county: data.county,
      postcode: data.postcode,
      country: data.country,
      inheritSettings: data.inheritSettings,
      allowedProgramIds: data.allowedProgramIds ?? [],
      allowedRoles: data.allowedRoles ?? [],
      parentOrgId: orgId,
      isParentOrg: false,
    },
  })

  return NextResponse.json({ school }, { status: 201 })
}
