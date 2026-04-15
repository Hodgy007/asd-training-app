import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  allowedProgramIds: z.array(z.string()).default([]),
  allowedRoles: z.array(z.string()).default(['STUDENT', 'CAREGIVER', 'CAREER_DEV_OFFICER', 'INTERN', 'EMPLOYEE']),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80)
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const cohorts = await prisma.organisation.findMany({
    where: { orgType: 'COHORT' },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(cohorts)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // Generate a unique slug
  const baseSlug = slugify(parsed.data.name) || 'cohort'
  const suffix = Math.random().toString(36).substring(2, 7)
  const slug = `cohort-${baseSlug}-${suffix}`

  const cohort = await prisma.organisation.create({
    data: {
      name: parsed.data.name,
      slug,
      orgType: 'COHORT',
      allowedProgramIds: parsed.data.allowedProgramIds,
      allowedRoles: parsed.data.allowedRoles,
      active: true,
    },
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(cohort, { status: 201 })
}
