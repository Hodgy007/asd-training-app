import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { TRAINING_MODULES } from '@/lib/training-data'
import { ModuleCard } from '@/components/training/module-card'
import { isAdmin } from '@/lib/rbac'

export default async function TrainingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const progressRecords = await prisma.trainingProgress.findMany({
    where: { userId: session.user.id },
  })

  const totalLessons = TRAINING_MODULES.reduce((acc, m) => acc + m.lessons.length, 0)
  const completedLessons = progressRecords.filter((p) => p.completed).length

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Training Hub</h1>
        <p className="text-slate-500 mt-1">
          Complete all 5 modules to become a confident ASD observation practitioner.
        </p>
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
              {Math.round((completedLessons / totalLessons) * 100)}%
            </p>
          </div>
        </div>
        <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all"
            style={{ width: `${(completedLessons / totalLessons) * 100}%` }}
          />
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRAINING_MODULES.map((module, index) => {
          const moduleProgress = progressRecords.filter(
            (p) => p.moduleId === module.id && p.completed
          )
          const previousModuleComplete =
            index === 0 ||
            progressRecords.filter(
              (p) =>
                p.moduleId === TRAINING_MODULES[index - 1].id && p.completed
            ).length === TRAINING_MODULES[index - 1].lessons.length

          return (
            <ModuleCard
              key={module.id}
              module={module}
              completedLessons={moduleProgress.length}
              locked={!isAdmin(session) && !previousModuleComplete && index > 0}
            />
          )
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm text-amber-800">
          <strong>About this training:</strong> These modules are designed to help caregivers and
          early years practitioners recognise and document developmental patterns. Completing this
          training does not qualify you to diagnose ASD. Always refer concerns to a qualified
          healthcare professional.
        </p>
      </div>
    </div>
  )
}
