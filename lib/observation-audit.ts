import { prisma } from '@/lib/prisma'
import type { ObservationAccessAction } from '@prisma/client'

/**
 * Record an access event against a child's observation record.
 *
 * Every read, create, update, delete, AI-generation and export action on a
 * child's observations must land here. The DPIA commits to a tamper-evident
 * audit trail of who accessed what, when.
 *
 * Failures are swallowed (logged only) — an audit write must never block a
 * user-initiated action. A follow-up alerting job covers missed writes.
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
