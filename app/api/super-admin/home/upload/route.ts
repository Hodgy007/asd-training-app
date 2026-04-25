import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { put } from '@vercel/blob'
import { validateUpload, MAX_FILE_SIZE } from '@/lib/upload-validation'

// Only image + video kinds are accepted from the Home editor — documents go
// elsewhere. Frontend already restricts the file picker; this is the
// server-side enforcement.
const ALLOWED_KINDS = new Set(['image', 'video'])

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const kind = (formData.get('kind') as string) || ''

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }
  if (!ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ error: 'Unsupported media kind.' }, { status: 400 })
  }

  // Image vs video MIME guard — extra defence on top of validateUpload.
  const mime = (file.type || '').toLowerCase()
  if (kind === 'image' && !mime.startsWith('image/')) {
    return NextResponse.json({ error: 'That file is not an image.' }, { status: 400 })
  }
  if (kind === 'video' && !mime.startsWith('video/')) {
    return NextResponse.json({ error: 'That file is not a video.' }, { status: 400 })
  }

  const validation = validateUpload(file)
  if (!validation.valid) {
    const status = file.size > MAX_FILE_SIZE ? 413 : 400
    return NextResponse.json({ error: validation.error }, { status })
  }

  // Pre-flight: Vercel Blob client throws an opaque error when the token is
  // missing. Surface a clear message instead of a generic 500.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          'Image/video uploads need BLOB_READ_WRITE_TOKEN in your environment. Run `npx vercel env pull .env.local` to fetch it, then restart the dev server.',
      },
      { status: 503 },
    )
  }

  try {
    const blob = await put(`home-media/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    })
    return NextResponse.json({ url: blob.url, kind, fileName: file.name, size: file.size })
  } catch (err) {
    console.error('home/upload: Vercel Blob put() failed', err)
    const message = err instanceof Error ? err.message : 'Unknown upload error.'
    return NextResponse.json(
      { error: `Upload failed: ${message}` },
      { status: 502 },
    )
  }
}
