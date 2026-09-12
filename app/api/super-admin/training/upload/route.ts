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

  const validation = validateUpload(file)
  if (!validation.valid) {
    const status = file.size > MAX_FILE_SIZE ? 413 : 400
    return NextResponse.json({ error: validation.error }, { status })
  }

  // `folder` becomes the blob path prefix. Restrict it to a fixed allow-list so
  // a caller can't write into another feature's namespace (e.g. `scorm/<id>/`,
  // whose contents are served to learners, or `home-media/`). The 50 MB cap in
  // validateUpload always applies now — the old `skipSizeCheck` flag let a
  // client disable it, and the Vercel body limit already bounds this path.
  const ALLOWED_FOLDERS = new Set([
    'training-media', 'training-images', 'carousel-images', 'hotspot-images', 'training-videos',
  ])
  const requestedFolder = (formData.get('folder') as string) || 'training-media'
  if (!ALLOWED_FOLDERS.has(requestedFolder)) {
    return NextResponse.json({ error: 'Invalid upload folder' }, { status: 400 })
  }

  const blob = await put(`${requestedFolder}/${file.name}`, file, {
    access: 'public',
    addRandomSuffix: true,
  })

  return NextResponse.json({ url: blob.url, fileName: file.name, size: file.size })
}
