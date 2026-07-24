import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessJobs, canManageJobs } from '@/lib/rbac'
import { getJobForUser, resolveJobVisibilityUser } from '@/lib/jobs'

// Auth-gated proxy for job attachment downloads. Visibility is checked
// each request: managers always pass; learners must be able to see the
// job via the same rules as the listing endpoint.
export async function GET(
  _req: NextRequest,
  { params }: { params: { jobId: string; attachmentId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!canManageJobs(session) && !canAccessJobs(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const att = await prisma.jobAttachment.findUnique({
    where: { id: params.attachmentId },
    select: { id: true, filename: true, url: true, jobId: true },
  })
  if (!att || att.jobId !== params.jobId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!canManageJobs(session)) {
    const job = await getJobForUser(params.jobId, await resolveJobVisibilityUser(session.user))
    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const upstream = await fetch(att.url)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'File unavailable' }, { status: 502 })
  }

  const headers = new Headers()
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/pdf')
  const len = upstream.headers.get('content-length')
  if (len) headers.set('Content-Length', len)
  const safeName = att.filename.replace(/[\r\n"]/g, '')
  headers.set('Content-Disposition', `attachment; filename="${safeName}"`)
  headers.set('Cache-Control', 'private, no-store')

  return new NextResponse(upstream.body, { status: 200, headers })
}
