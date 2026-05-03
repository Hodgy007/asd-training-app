/**
 * Structured JSON logger for Vercel.
 *
 * Emits one JSON object per line so Vercel's runtime log viewer can parse
 * fields (level, env, route, userId, requestId, etc.) and let you filter on
 * them. Keep log lines small and avoid logging PII (emails, names, full
 * passwords, raw API keys) — log identifiers and error codes instead.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('stripe.webhook.received', { eventType, eventId })
 *   logger.error('user.update.failed', { userId, error: errMessage(err) })
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

type Meta = Record<string, unknown>

function emit(level: Level, msg: string, meta: Meta = {}): void {
  const entry = {
    level,
    msg,
    ts: new Date().toISOString(),
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
    ...meta,
  }

  let line: string
  try {
    line = JSON.stringify(entry)
  } catch {
    line = JSON.stringify({
      level,
      msg,
      ts: entry.ts,
      env: entry.env,
      meta_serialise_error: true,
    })
  }

  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else if (level === 'debug') {
    console.debug(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  debug: (msg: string, meta?: Meta) => emit('debug', msg, meta),
  info: (msg: string, meta?: Meta) => emit('info', msg, meta),
  warn: (msg: string, meta?: Meta) => emit('warn', msg, meta),
  error: (msg: string, meta?: Meta) => emit('error', msg, meta),
}

/** Normalise an unknown caught value into a stable shape for logging. */
export function errMeta(err: unknown): { error: string; stack?: string } {
  if (err instanceof Error) {
    return { error: err.message, stack: err.stack }
  }
  return { error: String(err) }
}
