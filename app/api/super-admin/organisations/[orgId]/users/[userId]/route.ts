import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { isSystemOrg } from '@/lib/cohort'

const SYSTEM_ORG_ROLES = ['LEARNER'] as const

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(SYSTEM_ORG_ROLES).optional(),
  active: z.boolean().optional(),
  allowedProgramIds: z.array(z.string()).optional(),
  cvBuilderEnabled: z.boolean().optional(),
  careersAdvisorEnabled: z.boolean().optional(),
  surveyIds: z.array(z.string()).optional(),
})

/**
 * Edit a user on a system org (Independent Learners). Per-user role and
 * program assignment is the *only* way to give content to unaffiliated
 * learners — the org itself doesn't have a baseline.
 *
 * For now this only supports the system org. Editing users on regular orgs
 * still happens via the org admin's own user-management UI.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string; userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_ORGANISATIONS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const org = await prisma.organisation.findUnique({ where: { id: params.orgId } })
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  if (!isSystemOrg(org)) {
    return NextResponse.json(
      { error: 'This endpoint only edits Independent Learners users.' },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, organisationId: true },
  })
  if (!user || user.organisationId !== params.orgId) {
    return NextResponse.json({ error: 'User not found in this organisation.' }, { status: 404 })
  }

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // Pull surveyIds out — it's a join-table sync, not a User column update.
  const { surveyIds, ...userData } = parsed.data

  const updated = await prisma.user.update({
    where: { id: params.userId },
    data: userData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      allowedProgramIds: true,
      cvBuilderEnabled: true,
      careersAdvisorEnabled: true,
    },
  })

  if (surveyIds !== undefined) {
    // Sync per-user SurveyTarget rows: delete the user's existing user-targeted
    // rows (org/role-targeted ones for this user are untouched — they point at
    // userId=null), then re-create from the new list.
    await prisma.surveyTarget.deleteMany({
      where: { userId: params.userId },
    })
    if (surveyIds.length > 0) {
      await prisma.surveyTarget.createMany({
        data: surveyIds.map((surveyId) => ({ surveyId, userId: params.userId })),
        skipDuplicates: true,
      })
    }
  }

  return NextResponse.json(updated)
}
