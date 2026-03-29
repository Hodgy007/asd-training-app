import prisma from './prisma'
import type { Module, Lesson, QuizQuestion, ModuleType } from '@prisma/client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ModuleWithLessons = Module & {
  lessons: (Lesson & { _count: { quizQuestions: number } })[]
}

export type LessonWithQuiz = Lesson & { quizQuestions: QuizQuestion[] }

// ─── Super-admin queries (includes inactive records) ─────────────────────────

/** All modules ordered by type then order, each with a lesson count. */
export async function getAllModules(): Promise<(Module & { _count: { lessons: number } })[]> {
  return prisma.module.findMany({
    orderBy: [{ type: 'asc' }, { order: 'asc' }],
    include: { _count: { select: { lessons: true } } },
  })
}

/** Single module with all its lessons (any active state) plus quiz question counts. */
export async function getModuleById(moduleId: string): Promise<ModuleWithLessons | null> {
  return prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      lessons: {
        orderBy: { order: 'asc' },
        include: { _count: { select: { quizQuestions: true } } },
      },
    },
  })
}

/** Single lesson with all its quiz questions (any active state). */
export async function getLessonById(lessonId: string): Promise<LessonWithQuiz | null> {
  return prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      quizQuestions: { orderBy: { order: 'asc' } },
    },
  })
}

// ─── User-facing queries (active records only) ───────────────────────────────

/** Active modules of the given type, ordered. */
export async function getModules(type: ModuleType): Promise<Module[]> {
  return prisma.module.findMany({
    where: { active: true, type },
    orderBy: { order: 'asc' },
  })
}

/** Single active module with active lessons and quiz question counts. */
export async function getModuleByIdActive(moduleId: string): Promise<ModuleWithLessons | null> {
  return prisma.module.findFirst({
    where: { id: moduleId, active: true },
    include: {
      lessons: {
        where: { active: true },
        orderBy: { order: 'asc' },
        include: { _count: { select: { quizQuestions: true } } },
      },
    },
  })
}

/** Single active lesson with its quiz questions. */
export async function getLessonByIdActive(lessonId: string): Promise<LessonWithQuiz | null> {
  return prisma.lesson.findFirst({
    where: { id: lessonId, active: true },
    include: {
      quizQuestions: { orderBy: { order: 'asc' } },
    },
  })
}

/** Total count of active lessons that belong to active modules. */
export async function getTotalActiveLessons(): Promise<number> {
  return prisma.lesson.count({
    where: {
      active: true,
      module: { active: true },
    },
  })
}

/** Count of active lessons within a specific module. */
export async function getActiveLessonCount(moduleId: string): Promise<number> {
  return prisma.lesson.count({
    where: { moduleId, active: true },
  })
}
