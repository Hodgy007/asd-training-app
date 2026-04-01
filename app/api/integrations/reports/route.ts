import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/integration-auth'
import { prisma } from '@/lib/prisma'

async function fetchTraining() {
  const allModules = await prisma.module.findMany({
    where: { active: true },
    orderBy: [{ programId: 'asc' }, { order: 'asc' }],
    select: { id: true, title: true, programId: true, program: { select: { name: true } } },
  })

  const orgs = await prisma.organisation.findMany({
    select: {
      id: true, name: true, slug: true, allowedProgramIds: true,
      users: {
        where: { role: { notIn: ['SUPER_ADMIN', 'ORG_ADMIN'] } },
        select: {
          id: true,
          trainingProgress: { where: { completed: true }, select: { moduleId: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  return orgs.map((org) => {
    const totalUsers = org.users.length
    const orgModuleIds = allModules
      .filter((m) => org.allowedProgramIds.includes(m.programId))
      .map((m) => m.id)

    const modules = orgModuleIds.map((moduleId) => {
      const mod = allModules.find((m) => m.id === moduleId)
      const completions = org.users.filter((u) =>
        u.trainingProgress.some((p) => p.moduleId === moduleId)
      ).length
      return {
        moduleId,
        moduleName: mod?.title ?? moduleId,
        programName: mod?.program?.name ?? 'Unknown',
        completions,
        totalUsers,
        completionRate: totalUsers > 0 ? Math.round((completions / totalUsers) * 100) : 0,
      }
    })
    return { organisationId: org.id, organisationName: org.name, slug: org.slug, totalUsers, modules }
  })
}

async function fetchLibrary() {
  const collections = await prisma.libraryCollection.findMany({
    include: {
      _count: { select: { documents: true } },
      documents: {
        include: { events: { where: { action: 'download' } } },
      },
    },
  })

  return collections.map((col) => ({
    collectionId: col.id,
    collectionTitle: col.title,
    active: col.active,
    documentCount: col._count.documents,
    totalDownloads: col.documents.reduce((s, d) => s + d.events.length, 0),
    documents: col.documents.map((doc) => ({
      documentId: doc.id,
      title: doc.title,
      fileName: doc.fileName,
      downloads: doc.events.length,
    })),
  }))
}

async function fetchSurveys() {
  const surveys = await prisma.survey.findMany({
    include: {
      questions: { orderBy: { order: 'asc' } },
      responses: {
        where: { completedAt: { not: null } },
        include: {
          answers: true,
          user: {
            select: {
              name: true, role: true,
              organisation: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return surveys.map((survey) => ({
    surveyId: survey.id,
    title: survey.title,
    status: survey.status,
    createdAt: survey.createdAt,
    closesAt: survey.closesAt,
    questionCount: survey.questions.length,
    responseCount: survey.responses.length,
    responses: survey.responses.map((r) => ({
      respondent: r.user.name,
      role: r.user.role,
      organisation: r.user.organisation?.name ?? '',
      completedAt: r.completedAt,
      answers: survey.questions.map((q) => ({
        question: q.question,
        type: q.type,
        answer: r.answers.find((a) => a.questionId === q.id)?.value ?? '',
      })),
    })),
  }))
}

export async function GET(req: NextRequest) {
  const valid = await validateApiKey(req.headers.get('authorization'))
  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401 })
  }

  const section = req.nextUrl.searchParams.get('section')

  if (section === 'training') return NextResponse.json({ training: await fetchTraining() })
  if (section === 'library') return NextResponse.json({ library: await fetchLibrary() })
  if (section === 'surveys') return NextResponse.json({ surveys: await fetchSurveys() })

  // All sections
  const [training, library, surveys] = await Promise.all([
    fetchTraining(),
    fetchLibrary(),
    fetchSurveys(),
  ])

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    training,
    library,
    surveys,
  })
}
