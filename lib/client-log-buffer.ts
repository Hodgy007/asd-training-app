export type LogLevel = 'log' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  message: string
  ts: number
  source?: string
}

const MAX_ENTRIES = 50
const buffer: LogEntry[] = []

function push(entry: LogEntry) {
  buffer.push(entry)
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES)
}

function stringifyArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message
      if (typeof a === 'string') return a
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

// Module-scoped flag: resets on vi.resetModules(), so each fresh import
// runs install() once, and a second import of the same cached module is a no-op.
let installed = false

function install() {
  if (typeof window === 'undefined') return
  if (installed) return
  installed = true

  const levels: LogLevel[] = ['log', 'info', 'warn', 'error']
  for (const level of levels) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      push({ level, message: stringifyArgs(args), ts: Date.now() })
      original(...args)
    }
  }

  window.addEventListener('error', (event) => {
    const source = [event.filename, event.lineno, event.colno].filter(Boolean).join(':')
    push({
      level: 'error',
      message: event.message || String(event.error),
      source: source || undefined,
      ts: Date.now(),
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    const message =
      reason instanceof Error ? reason.stack || reason.message : stringifyArgs([reason])
    push({ level: 'error', message: `Unhandled rejection: ${message}`, ts: Date.now() })
  })
}

install()

export function getBufferedLogs(): LogEntry[] {
  return buffer.slice()
}
