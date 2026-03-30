import { prisma } from './prisma'
import type { Role } from '@prisma/client'

// ── Admin queries ──

export async function listSurveys() {
  return prisma.survey.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true, responses: true } },
      targets: {
        include: { organisation: { select: { id: true, name: true } } },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function getSurveyById(surveyId: string) {
  return prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      targets: {
        include: { organisation: { select: { id: true, name: true } } },
      },
      _count: { select: { responses: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function getSurveyResults(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { order: 'asc' } },
      targets: {
        include: { organisation: { select: { id: true, name: true } } },
      },
      responses: {
        where: { completedAt: { not: null } },
        include: {
          answers: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              organisationId: true,
              organisation: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })
  return survey
}

export async function getTargetedUserCount(surveyId: string): Promise<number> {
  const targets = await prisma.surveyTarget.findMany({
    where: { surveyId },
  })

  if (targets.length === 0) return 0

  const orConditions: Array<Record<string, unknown>> = []
  for (const t of targets) {
    const condition: Record<string, unknown> = {
      role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] as Role[] },
      active: true,
    }
    if (t.role) condition.role = t.role
    if (t.organisationId) condition.organisationId = t.organisationId
    orConditions.push(condition)
  }

  return prisma.user.count({ where: { OR: orConditions } })
}

export async function getSurveyInsights(surveyId: string) {
  return prisma.surveyInsight.findMany({
    where: { surveyId },
    orderBy: { generatedAt: 'desc' },
  })
}

// ── User queries ──

export async function getPendingSurveys(userId: string, userRole: Role, userOrgId: string | null) {
  const now = new Date()

  const surveys = await prisma.survey.findMany({
    where: {
      status: 'PUBLISHED',
      OR: [
        { closesAt: null },
        { closesAt: { gt: now } },
      ],
      targets: {
        some: {
          AND: [
            { OR: [{ role: null }, { role: userRole }] },
            { OR: [{ organisationId: null }, { organisationId: userOrgId }] },
          ],
        },
      },
      NOT: {
        responses: {
          some: { userId, completedAt: { not: null } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true } },
    },
  })

  return surveys
}

export async function getSurveyForUser(surveyId: string, userId: string, userRole: Role, userOrgId: string | null) {
  const survey = await prisma.survey.findFirst({
    where: {
      id: surveyId,
      status: 'PUBLISHED',
      OR: [
        { closesAt: null },
        { closesAt: { gt: new Date() } },
      ],
      targets: {
        some: {
          AND: [
            { OR: [{ role: null }, { role: userRole }] },
            { OR: [{ organisationId: null }, { organisationId: userOrgId }] },
          ],
        },
      },
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  })

  if (!survey) return null

  const existing = await prisma.surveyResponse.findUnique({
    where: { surveyId_userId: { surveyId, userId } },
  })
  if (existing?.completedAt) return null

  return survey
}

export async function submitSurveyResponse(
  surveyId: string,
  userId: string,
  answers: Array<{ questionId: string; value: string }>
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.surveyResponse.findUnique({
      where: { surveyId_userId: { surveyId, userId } },
    })
    if (existing?.completedAt) {
      throw new Error('Survey already completed')
    }

    const response = existing
      ? await tx.surveyResponse.update({
          where: { id: existing.id },
          data: { completedAt: new Date() },
        })
      : await tx.surveyResponse.create({
          data: {
            surveyId,
            userId,
            completedAt: new Date(),
          },
        })

    await tx.surveyAnswer.createMany({
      data: answers.map((a) => ({
        responseId: response.id,
        questionId: a.questionId,
        value: a.value,
      })),
    })

    return response
  })
}
