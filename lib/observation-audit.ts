import { prisma } from '@/lib/prisma'
import type { ObservationAccessAction } from '@prisma/client'

/**
 * Record an access event against a child's observation record.
 *
 * Logged: CREATE, UPDATE, DELETE, AI_INSIGHT_GENERATE, EXPORT.
 *
 * NOT logged: owner-reads (OBSERVATION_READ / AI_INSIGHT_READ where the actor
 * is the caregiver who owns the child). The current model only permits the
 * owner to read, so every read is self — logging them is noise. If non-owner
 * read paths are added later (ORG_ADMIN drill-down, shared-child access),
 * log those reads specifically. The enum values remain in the schema so no
 * migration is needed when that happens.
 *
 * Failures are swallowed (logged only) — an audit write must never block a
 * user-initiated action.
 */
export async function logObservationAccess(params: {
  childId: string
  actorId: string
  action: ObservationAccessAction
  metadata?: Record<string, unknown>
  ipAddress?: string | null
}): Promise<void> {
  try {
    await prisma.observationAccessLog.create({
      data: {
        childId: params.childId,
        actorId: params.actorId,
        action: params.action,
        metadata: params.metadata ? (params.metadata as object) : undefined,
        ipAddress: params.ipAddress ?? undefined,
      },
    })
  } catch (error) {
    console.error('[audit] failed to write ObservationAccessLog', {
      childId: params.childId,
      action: params.action,
      error,
    })
  }
}

export function ipFromHeaders(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  return headers.get('x-real-ip')
}
