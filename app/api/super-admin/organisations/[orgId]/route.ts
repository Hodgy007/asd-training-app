import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { LEAF_ROLES } from '@/types'
import { isSystemOrg } from '@/lib/cohort'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  allowedRoles: z.array(z.string()).refine(
    (roles) => roles.every((r) => LEAF_ROLES.includes(r as any)),
    'Only leaf roles are allowed'
  ).optional(),
  allowedProgramIds: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  contactName: z.string().max(200).optional(),
  contactEmail: z.string().email().max(200).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  postcode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  assignedCollectionIds: z.array(z.string()).optional(),
  assignedSurveyIds: z.array(z.string()).optional(),
  cvBuilderEnabled: z.boolean().optional(),
  careersAdvisorEnabled: z.boolean().optional(),
  organisationType: z.enum(['SCHOOL', 'COLLEGE', 'ACADEMY', 'UNIVERSITY', 'EMPLOYER', 'EDUCATION', 'BUSINESS']).optional(),
  isParentOrg: z.boolean().optional(),
  observationLawfulBasis: z.enum(['CONSENT', 'PUBLIC_TASK', 'LEGITIMATE_INTERESTS']).optional(),
  observationRetentionDays: z.number().int().min(1).max(10000).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({
    where: { id: params.orgId },
    include: {
      users: {
        select: {
          id: true, name: true, email: true, role: true, active: true,
          mustChangePassword: true, createdAt: true,
          password: true,
          allowedProgramIds: true,
          _count: { select: { trainingProgress: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { users: true } },
      childOrgs: { select: { id: true, name: true, active: true } },
      parentOrg: { select: { id: true, name: true } },
    },
  })

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch collections assigned to this org
  const assignedCollections = await prisma.libraryCollection.findMany({
    where: { targetOrgIds: { has: params.orgId } },
    select: { id: true },
  })

  // Fetch survey targets for this org
  const surveyTargets = await prisma.surveyTarget.findMany({
    where: { organisationId: params.orgId },
    select: { surveyId: true },
  })

  // Strip password hashes and add ssoOnly flag
  const orgWithSso = {
    ...org,
    users: org.users.map(({ password, ...rest }) => ({ ...rest, ssoOnly: password === '' })),
    assignedCollectionIds: assignedCollections.map((c) => c.id),
    assignedSurveyIds: surveyTargets.map((t) => t.surveyId),
  }
  return NextResponse.json(orgWithSso)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const org = await prisma.organisation.findUnique({ where: { id: params.orgId } })
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (parsed.data.slug && parsed.data.slug !== org.slug) {
    const slugExists = await prisma.organisation.findUnique({ where: { slug: parsed.data.slug } })
    if (slugExists) {
      return NextResponse.json({ error: 'Slug already in use.' }, { status: 409 })
    }
  }

  // Extract collection/survey assignment arrays before passing to org update
  const { assignedCollectionIds, assignedSurveyIds, ...orgData } = parsed.data

  // System orgs (Independent Learners): block only the changes that would
  // break the singleton. The slug is how `isSystemOrg` finds the row, and
  // its `active=true` / `pendingApproval=false` invariants are what make
  // signup work. Everything else is fine to edit (name display, contact
  // details, library/survey targeting, feature flags).
  if (isSystemOrg(org)) {
    if (parsed.data.slug && parsed.data.slug !== org.slug) {
      return NextResponse.json(
        { error: 'The system org slug cannot be changed.' },
        { status: 400 }
      )
    }
    if (parsed.data.active === false) {
      return NextResponse.json(
        { error: 'The system org cannot be deactivated.' },
        { status: 400 }
      )
    }
  }

  const updated = await prisma.organisation.update({
    where: { id: params.orgId },
    data: orgData,
  })

  // ── Update library collection targeting ────────────────────────────────────
  if (assignedCollectionIds !== undefined) {
    // Get all collections that currently include this org
    const allCollections = await prisma.libraryCollection.findMany({
      select: { id: true, targetOrgIds: true },
    })

    for (const col of allCollections) {
      const isCurrentlyAssigned = col.targetOrgIds.includes(params.orgId)
      const shouldBeAssigned = assignedCollectionIds.includes(col.id)

      if (shouldBeAssigned && !isCurrentlyAssigned) {
        // Add org to this collection's targetOrgIds
        await prisma.libraryCollection.update({
          where: { id: col.id },
          data: { targetOrgIds: [...col.targetOrgIds, params.orgId] },
        })
      } else if (!shouldBeAssigned && isCurrentlyAssigned) {
        // Remove org from this collection's targetOrgIds
        await prisma.libraryCollection.update({
          where: { id: col.id },
          data: { targetOrgIds: col.targetOrgIds.filter((id) => id !== params.orgId) },
        })
      }
    }
  }

  // ── Update survey targeting ────────────────────────────────────────────────
  if (assignedSurveyIds !== undefined) {
    // Get current survey targets for this org
    const currentTargets = await prisma.surveyTarget.findMany({
      where: { organisationId: params.orgId },
      select: { id: true, surveyId: true },
    })
    const currentSurveyIds = currentTargets.map((t) => t.surveyId)

    // Add new targets
    const toAdd = assignedSurveyIds.filter((id) => !currentSurveyIds.includes(id))
    if (toAdd.length > 0) {
      await prisma.surveyTarget.createMany({
        data: toAdd.map((surveyId) => ({
          surveyId,
          organisationId: params.orgId,
        })),
      })
    }

    // Remove old targets
    const toRemove = currentTargets.filter((t) => !assignedSurveyIds.includes(t.surveyId))
    if (toRemove.length > 0) {
      await prisma.surveyTarget.deleteMany({
        where: { id: { in: toRemove.map((t) => t.id) } },
      })
    }
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({
    where: { id: params.orgId },
    include: { _count: { select: { users: true } } },
  })

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (isSystemOrg(org)) {
    return NextResponse.json(
      { error: 'This is a system-managed organisation and cannot be deleted.' },
      { status: 400 }
    )
  }

  if (org._count.users > 0) {
    return NextResponse.json(
      { error: 'Cannot delete an organisation that has users. Reassign or delete all users first.' },
      { status: 409 }
    )
  }

  await prisma.organisation.delete({ where: { id: params.orgId } })
  return NextResponse.json({ success: true })
}
