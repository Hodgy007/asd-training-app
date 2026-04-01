import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const surveys = await prisma.survey.findMany({
    include: {
      questions: { orderBy: { order: 'asc' } },
      targets: { include: { organisation: { select: { name: true } } } },
      responses: {
        where: { completedAt: { not: null } },
        include: {
          answers: true,
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              organisation: { select: { id: true, name: true } },
            },
          },
        },
      },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get targeted user counts for each survey
  const surveyReports = await Promise.all(
    surveys.map(async (survey) => {
      // Build target conditions for counting
      const targetConditions = survey.targets.map((t) => {
        const cond: Record<string, unknown> = {
          role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] },
          active: true,
        }
        if (t.role) cond.role = t.role
        if (t.organisationId) cond.organisationId = t.organisationId
        return cond
      })

      const targetedCount =
        targetConditions.length > 0
          ? await prisma.user.count({ where: { OR: targetConditions } })
          : await prisma.user.count({
              where: { role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] }, active: true },
            })

      const responseCount = survey.responses.length
      const responseRate =
        targetedCount > 0 ? Math.round((responseCount / targetedCount) * 100) : 0

      // Aggregate question stats
      const questionStats = survey.questions.map((q) => {
        const answers = survey.responses.flatMap((r) =>
          r.answers.filter((a) => a.questionId === q.id)
        )

        if (q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTI_SELECT') {
          const options: string[] = q.options ? JSON.parse(q.options as string) : []
          const optionCounts: Record<string, number> = {}
          for (const opt of options) optionCounts[opt] = 0
          for (const a of answers) {
            if (q.type === 'MULTI_SELECT') {
              try {
                const vals: string[] = JSON.parse(a.value)
                for (const v of vals) optionCounts[v] = (optionCounts[v] ?? 0) + 1
              } catch {
                optionCounts[a.value] = (optionCounts[a.value] ?? 0) + 1
              }
            } else {
              optionCounts[a.value] = (optionCounts[a.value] ?? 0) + 1
            }
          }
          return {
            questionId: q.id,
            question: q.question,
            type: q.type,
            totalAnswers: answers.length,
            optionCounts,
          }
        }

        if (q.type === 'YES_NO') {
          let yes = 0, no = 0
          for (const a of answers) {
            if (a.value.toLowerCase() === 'yes') yes++
            else no++
          }
          return {
            questionId: q.id,
            question: q.question,
            type: q.type,
            totalAnswers: answers.length,
            optionCounts: { Yes: yes, No: no },
          }
        }

        if (q.type === 'RATING_SCALE') {
          const ratings = answers.map((a) => parseInt(a.value)).filter((n) => !isNaN(n))
          const avg = ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : 0
          const distribution: Record<string, number> = {}
          for (let i = 1; i <= 5; i++) distribution[String(i)] = 0
          for (const r of ratings) distribution[String(r)] = (distribution[String(r)] ?? 0) + 1
          return {
            questionId: q.id,
            question: q.question,
            type: q.type,
            totalAnswers: answers.length,
            average: Math.round(avg * 10) / 10,
            distribution,
          }
        }

        // FREE_TEXT
        return {
          questionId: q.id,
          question: q.question,
          type: q.type,
          totalAnswers: answers.length,
          sampleAnswers: answers.slice(0, 5).map((a) => a.value),
        }
      })

      // Per-org response breakdown
      const orgBreakdown: Record<string, { orgName: string; responses: number }> = {}
      for (const r of survey.responses) {
        const orgName = r.user.organisation?.name ?? 'No Organisation'
        const orgId = r.user.organisation?.id ?? 'none'
        if (!orgBreakdown[orgId]) orgBreakdown[orgId] = { orgName, responses: 0 }
        orgBreakdown[orgId].responses++
      }

      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        createdAt: survey.createdAt,
        closesAt: survey.closesAt,
        createdBy: survey.createdBy?.name ?? 'Unknown',
        questionCount: survey.questions.length,
        targetedCount,
        responseCount,
        responseRate,
        questionStats,
        orgBreakdown: Object.values(orgBreakdown).sort((a, b) => b.responses - a.responses),
        // Individual responses for CSV export
        responses: survey.responses.map((r) => ({
          userName: r.user.name,
          userRole: r.user.role,
          orgName: r.user.organisation?.name ?? '',
          completedAt: r.completedAt,
          answers: r.answers.map((a) => ({
            questionId: a.questionId,
            value: a.value,
          })),
        })),
        questions: survey.questions.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          order: q.order,
        })),
      }
    })
  )

  const totals = {
    totalSurveys: surveys.length,
    published: surveys.filter((s) => s.status === 'PUBLISHED').length,
    closed: surveys.filter((s) => s.status === 'CLOSED').length,
    draft: surveys.filter((s) => s.status === 'DRAFT').length,
    totalResponses: surveys.reduce((s, sv) => s + sv.responses.length, 0),
  }

  return NextResponse.json({ totals, surveys: surveyReports })
}
