import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'
import { validateUpload, MAX_FILE_SIZE } from '@/lib/upload-validation'

interface Params {
  params: { lessonId: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: params.lessonId } })
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const validation = validateUpload(file)
  if (!validation.valid) {
    const status = file.size > MAX_FILE_SIZE ? 413 : 400
    return NextResponse.json({ error: validation.error }, { status })
  }

  const blob = await put(`training-attachments/${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true,
  })

  const attachment = await prisma.lessonAttachment.create({
    data: {
      lessonId: params.lessonId,
      fileName: file.name,
      fileSize: file.size,
      url: blob.url,
    },
  })

  // Don't expose the raw Blob URL — return the auth-gated proxy URL.
  return NextResponse.json(
    { ...attachment, url: `/api/training/attachments/${attachment.id}/file` },
    { status: 201 },
  )
}
