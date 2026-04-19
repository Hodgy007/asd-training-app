import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { canManageJobs } from '@/lib/rbac'

export const runtime = 'nodejs'

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!canManageJobs(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 })
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 4 MB)' }, { status: 400 })
  }
  const blob = await put(`jobs/logos/${Date.now()}-${file.name}`, file, {
    access: 'public',
    contentType: file.type,
  })
  return NextResponse.json({ url: blob.url })
}
