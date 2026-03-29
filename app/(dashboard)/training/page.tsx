import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { isSuperAdmin } from '@/lib/rbac'
import Link from 'next/link'
import { BookOpen, ChevronRight } from 'lucide-react'

export default async function TrainingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Determine which programs the user has access to
  let programs: { id: string; name: string; description: string | null }[]

  if (isSuperAdmin(session)) {
    // SUPER_ADMIN can preview all active programs
    programs = await prisma.trainingProgram.findMany({
      where: { active: true },
      select: { id: true, name: true, description: true },
      orderBy: { order: 'asc' },
    })
  } else {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organisation: { select: { allowedProgramIds: true } } },
    })
    const allowedProgramIds = user?.organisation?.allowedProgramIds ?? []
    if (allowedProgramIds.length === 0) redirect('/dashboard')

    programs = await prisma.trainingProgram.findMany({
      where: { id: { in: allowedProgramIds }, active: true },
      select: { id: true, name: true, description: true },
      orderBy: { order: 'asc' },
    })
  }

  if (programs.length === 0) redirect('/dashboard')

  // If exactly 1 program, redirect straight to it
  if (programs.length === 1) {
    redirect(`/training/${programs[0].id}`)
  }

  // Multiple programs: show selection cards with progress summary
  const progressRecords = await prisma.trainingProgress.findMany({
    where: { userId: session.user.id, completed: true },
  })

  const programsWithProgress = await Promise.all(
    programs.map(async (program) => {
      const modules = await prisma.module.findMany({
        where: { programId: program.id, active: true },
        include: { lessons: { where: { active: true }, select: { id: true } } },
      })
      const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0)
      const completedLessons = progressRecords.filter((p) =>
        modules.some((m) => m.id === p.moduleId)
      ).length
      return { ...program, totalLessons, completedLessons, moduleCount: modules.length }
    })
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Training Programs</h1>
        <p className="text-slate-500 mt-1">
          Select a training program to continue your learning.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {programsWithProgress.map((program) => {
          const pct = program.totalLessons > 0
            ? Math.round((program.completedLessons / program.totalLessons) * 100)
            : 0

          return (
            <Link
              key={program.id}
              href={`/training/${program.id}`}
              className="card hover:shadow-md hover:border-primary-200 transition-all group"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-100">
                  <BookOpen className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">
                    {program.name}
                  </h2>
                  {program.description && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{program.description}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{program.moduleCount} modules &middot; {program.completedLessons}/{program.totalLessons} lessons</span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-calm-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-primary-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
