import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { canManageJobs } from '@/lib/rbac'

export const runtime = 'nodejs'

// Raster images only. SVG is deliberately excluded — it can carry inline
// <script>, and the logo URL is world-readable on the app's blob domain.
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp'])

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
  // addRandomSuffix so a caller can't overwrite another logo by reusing a
  // filename, and so the stored path isn't attacker-predictable.
  const blob = await put(`jobs/logos/${file.name}`, file, {
    access: 'public',
    contentType: file.type,
    addRandomSuffix: true,
  })
  return NextResponse.json({ url: blob.url })
}
