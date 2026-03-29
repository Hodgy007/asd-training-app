import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ModuleCard } from '@/components/training/module-card'
import { isSuperAdmin } from '@/lib/rbac'

export default async function ProgramPage({ params }: { params: { programId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const program = await prisma.trainingProgram.findFirst({
    where: { id: params.programId, active: true },
  })

  if (!program) redirect('/dashboard')

  // Check access: SUPER_ADMIN can preview all; others need org assignment
  if (!isSuperAdmin(session)) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organisation: { select: { allowedProgramIds: true } } },
    })
    const allowedProgramIds = user?.organisation?.allowedProgramIds ?? []
    if (!allowedProgramIds.includes(params.programId)) {
      redirect('/dashboard')
    }
  }

  // Fetch modules for this program
  const dbModules = await prisma.module.findMany({
    where: { programId: params.programId, active: true },
    orderBy: { order: 'asc' },
    include: {
      lessons: {
        where: { active: true },
        orderBy: { order: 'asc' },
        select: { id: true, title: true, type: true, order: true },
      },
    },
  })

  // Fetch user's progress
  const progressRecords = await prisma.trainingProgress.findMany({
    where: { userId: session.user.id, completed: true },
  })

  const totalLessons = dbModules.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedLessons = progressRecords.filter((p) =>
    dbModules.some((m) => m.id === p.moduleId)
  ).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{program.name}</h1>
        {program.description && (
          <p className="text-slate-500 mt-1">{program.description}</p>
        )}
      </div>

      {/* Overall progress */}
      <div className="card border-0 bg-primary-500">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-white/80">Your progress</p>
            <p className="text-3xl font-bold mt-1 text-white">
              {completedLessons}
              <span className="text-white/70 text-xl font-normal"> / {totalLessons}</span>
            </p>
            <p className="text-white/80 text-sm font-medium">lessons completed</p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold text-white">
              {totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%
            </p>
          </div>
        </div>
        <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dbModules.map((module, index) => {
          const moduleProgress = progressRecords.filter(
            (p) => p.moduleId === module.id && p.completed
          )
          const previousModuleComplete =
            index === 0 ||
            progressRecords.filter(
              (p) =>
                p.moduleId === dbModules[index - 1].id && p.completed
            ).length === dbModules[index - 1].lessons.length

          return (
            <ModuleCard
              key={module.id}
              module={module}
              completedLessons={moduleProgress.length}
              locked={!previousModuleComplete && index > 0}
              programId={params.programId}
            />
          )
        })}
      </div>
    </div>
  )
}
