import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canManageJobs } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF uploads are allowed' }, { status: 400 })
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 })
  }

  const blob = await put(`jobs/${params.jobId}/${Date.now()}-${file.name}`, file, {
    access: 'public',
    contentType: 'application/pdf',
  })

  const attachment = await prisma.jobAttachment.create({
    data: {
      jobId: params.jobId,
      filename: file.name,
      url: blob.url,
      sizeBytes: file.size,
    },
  })

  // Don't expose the raw Blob URL — return the auth-gated proxy URL.
  return NextResponse.json({
    attachment: {
      ...attachment,
      url: `/api/jobs/${params.jobId}/attachments/${attachment.id}/file`,
    },
  }, { status: 201 })
}
