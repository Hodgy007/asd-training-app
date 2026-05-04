import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { getServerSession } from 'next-auth'
import { withAuth } from '../api-auth'
import { CHARITY_PERMISSIONS } from '../rbac'

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/test', { method: 'GET' })
}

const mockSession = (overrides: Partial<{ id: string; role: string; charityPermissions: string[] }> = {}) =>
  ({
    user: {
      id: 'u_1',
      email: 'a@b.com',
      role: overrides.role ?? 'EMPLOYEE',
      charityPermissions: overrides.charityPermissions ?? [],
    },
  }) as never

describe('withAuth', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset()
  })

  it('returns 401 when no session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    const handler = withAuth(async ({ session }) => NextResponse.json({ id: session.user.id }))
    const res = await handler(makeReq(), { params: {} as never })
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('passes session through to handler when authenticated and no guard', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const inner = vi.fn(async ({ session }) => NextResponse.json({ id: session.user.id }))
    const handler = withAuth(inner)
    const res = await handler(makeReq(), { params: {} as never })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: 'u_1' })
    expect(inner).toHaveBeenCalledOnce()
  })

  it('returns 403 when role guard fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession({ role: 'EMPLOYEE' }))
    const handler = withAuth({ role: 'SUPER_ADMIN' }, async () => NextResponse.json({ ok: true }))
    const res = await handler(makeReq(), { params: {} as never })
    expect(res.status).toBe(403)
  })

  it('passes when role guard matches one of an array', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession({ role: 'ORG_ADMIN' }))
    const handler = withAuth(
      { role: ['SUPER_ADMIN', 'ORG_ADMIN'] },
      async () => NextResponse.json({ ok: true })
    )
    const res = await handler(makeReq(), { params: {} as never })
    expect(res.status).toBe(200)
  })

  it('SUPER_ADMIN passes any permission guard', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession({ role: 'SUPER_ADMIN' }))
    const handler = withAuth(
      { permission: CHARITY_PERMISSIONS.MANAGE_TRAINING },
      async () => NextResponse.json({ ok: true })
    )
    const res = await handler(makeReq(), { params: {} as never })
    expect(res.status).toBe(200)
  })

  it('CHARITY_EMPLOYEE without the permission is forbidden', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      mockSession({ role: 'CHARITY_EMPLOYEE', charityPermissions: ['view_reports'] })
    )
    const handler = withAuth(
      { permission: CHARITY_PERMISSIONS.MANAGE_TRAINING },
      async () => NextResponse.json({ ok: true })
    )
    const res = await handler(makeReq(), { params: {} as never })
    expect(res.status).toBe(403)
  })

  it('CHARITY_EMPLOYEE with the permission is allowed', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      mockSession({ role: 'CHARITY_EMPLOYEE', charityPermissions: ['manage_training'] })
    )
    const handler = withAuth(
      { permission: CHARITY_PERMISSIONS.MANAGE_TRAINING },
      async () => NextResponse.json({ ok: true })
    )
    const res = await handler(makeReq(), { params: {} as never })
    expect(res.status).toBe(200)
  })

  it('custom check guard runs against the session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession({ role: 'ORG_ADMIN' }))
    const handler = withAuth(
      { check: (s) => s.user.role === 'ORG_ADMIN' && s.user.id === 'u_1' },
      async () => NextResponse.json({ ok: true })
    )
    const res = await handler(makeReq(), { params: {} as never })
    expect(res.status).toBe(200)
  })

  it('custom check returning false yields 403', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession({ role: 'ORG_ADMIN' }))
    const handler = withAuth(
      { check: () => false },
      async () => NextResponse.json({ ok: true })
    )
    const res = await handler(makeReq(), { params: {} as never })
    expect(res.status).toBe(403)
  })

  it('forwards typed dynamic params to the handler', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession())
    const handler = withAuth<{ orgId: string }>(async ({ params }) =>
      NextResponse.json({ orgId: params.orgId })
    )
    const res = await handler(makeReq(), { params: { orgId: 'org_42' } })
    expect(await res.json()).toEqual({ orgId: 'org_42' })
  })
})
