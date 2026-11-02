// Outline helpers with no server imports, so the generator modal (a client
// component) can use them without pulling Prisma into the browser bundle.

import type { Outline } from './schemas'

export function pruneOutline(outline: Outline): Outline {
  return { ...outline, modules: outline.modules.filter((m) => m.lessons.length > 0) }
}

/** Objectives that no lesson in the outline cites. */
export function uncoveredObjectives<T extends { id: string }>(objectives: T[], outline: Outline): T[] {
  const covered = new Set(outline.modules.flatMap((m) => m.lessons.flatMap((l) => l.objectiveIds)))
  return objectives.filter((o) => !covered.has(o.id))
}
