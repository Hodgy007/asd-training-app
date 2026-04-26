// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('client-log-buffer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('keeps the newest 50 entries when more are pushed', async () => {
    const { getBufferedLogs } = await import('../client-log-buffer')
    for (let i = 0; i < 60; i++) console.log(`msg ${i}`)
    const logs = getBufferedLogs()
    expect(logs).toHaveLength(50)
    expect(logs[0].message).toBe('msg 10')
    expect(logs[49].message).toBe('msg 59')
  })

  it('captures console levels with the correct level field', async () => {
    const { getBufferedLogs } = await import('../client-log-buffer')
    console.log('a')
    console.warn('b')
    console.error('c')
    console.info('d')
    const logs = getBufferedLogs()
    const levels = logs.slice(-4).map((l) => l.level)
    expect(levels).toEqual(['log', 'warn', 'error', 'info'])
  })

  it('captures window error events', async () => {
    const { getBufferedLogs } = await import('../client-log-buffer')
    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', filename: 'x.js', lineno: 10 }))
    const logs = getBufferedLogs()
    const last = logs[logs.length - 1]
    expect(last.level).toBe('error')
    expect(last.message).toContain('boom')
    expect(last.source).toContain('x.js')
  })

  it('returns a copy of the buffer (caller mutation does not leak)', async () => {
    const { getBufferedLogs } = await import('../client-log-buffer')
    console.log('hello')
    const a = getBufferedLogs()
    a.push({ level: 'log', message: 'sneaky', ts: 0 })
    const b = getBufferedLogs()
    expect(b.find((e) => e.message === 'sneaky')).toBeUndefined()
  })

  it('still calls the original console method through (devtools see it)', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await import('../client-log-buffer')
    console.log('hi')
    expect(spy).toHaveBeenCalledWith('hi')
    spy.mockRestore()
  })

  it('is idempotent on re-import (does not double-wrap)', async () => {
    await import('../client-log-buffer')
    const wrapped = console.log
    await import('../client-log-buffer')
    expect(console.log).toBe(wrapped)
  })
})
