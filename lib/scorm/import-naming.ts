/**
 * Helpers for deriving a human-readable program name from a SCORM zip
 * filename, and for generating URL-safe IDs for auto-scaffolded Module /
 * Lesson rows.
 *
 * Module and Lesson IDs are used in URLs (e.g. `/super-admin/training/<id>`
 * and `/training/<program>/<module>/<lesson>`), so the existing admin APIs
 * restrict them to `[a-zA-Z0-9_-]+`. IDs generated here follow that rule.
 */

import { randomBytes } from 'crypto'

/**
 * Turn a SCORM zip filename into a sensible default program name.
 *
 *   "Autism_Awareness-Level_1.zip"  -> "Autism Awareness Level 1"
 *   "   messy (v2).ZIP"             -> "Messy (v2)"
 *   "sco.zip"                       -> "Sco"
 *   ""                              -> "SCORM Training"
 */
export function deriveProgramName(filename: string | null | undefined): string {
  if (!filename) return 'SCORM Training'
  // Strip directory components defensively.
  const base = filename.split(/[\\/]/).pop() ?? filename
  // Strip a trailing .zip (any case) and surrounding whitespace.
  const noExt = base.replace(/\.zip$/i, '').trim()
  if (noExt.length === 0) return 'SCORM Training'
  // Collapse runs of _ - . and whitespace to single spaces, trim.
  const spaced = noExt.replace(/[_\-.\s]+/g, ' ').trim()
  if (spaced.length === 0) return 'SCORM Training'
  // Title-case pure-alphabetic lowercase words; leave anything with digits or
  // mixed case alone so acronyms and version strings survive
  // (e.g. "iOS", "v2", "3D").
  return spaced
    .split(' ')
    .map((word) => {
      if (word.length === 0) return word
      if (!/^[a-z]+$/.test(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/**
 * Generate a URL-safe Module or Lesson ID. Prefix makes the ID self-describing
 * in Vercel logs / Prisma Studio; the random suffix keeps collisions
 * vanishingly unlikely without a DB round-trip.
 */
export function generateScormId(prefix: 'module' | 'lesson'): string {
  return `scorm-${prefix}-${randomBytes(8).toString('hex')}`
}
