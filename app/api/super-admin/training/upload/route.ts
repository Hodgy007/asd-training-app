import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'
import { put } from '@vercel/blob'
import { validateUpload, MAX_FILE_SIZE } from '@/lib/upload-validation'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const skipSizeCheck = formData.get('skipSizeCheck') === 'true'
  const validation = validateUpload(file, { skipSizeCheck })
  if (!validation.valid) {
    const status = file.size > MAX_FILE_SIZE ? 413 : 400
    return NextResponse.json({ error: validation.error }, { status })
  }

  const folder = formData.get('folder') as string || 'training-media'

  const blob = await put(`${folder}/${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true,
  })

  return NextResponse.json({ url: blob.url, fileName: file.name, size: file.size })
}
