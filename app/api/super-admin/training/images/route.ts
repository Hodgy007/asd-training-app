import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { list } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'

/**
 * Lists previously-uploaded training images so editors can reuse them in
 * hotspot and carousel blocks instead of re-uploading. Returns blobs from
 * the `carousel-images/` and `hotspot-images/` prefixes only.
 */

const ALLOWED_PREFIXES = ['carousel-images/', 'hotspot-images/'] as const
type Folder = 'carousel-images' | 'hotspot-images' | 'all'

interface ImageItem {
  url: string
  pathname: string
  folder: 'carousel-images' | 'hotspot-images'
  size: number
  uploadedAt: string
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const folderParam = (req.nextUrl.searchParams.get('folder') ?? 'all') as Folder
  const prefixes =
    folderParam === 'all'
      ? ALLOWED_PREFIXES
      : ALLOWED_PREFIXES.filter((p) => p === `${folderParam}/`)

  if (prefixes.length === 0) {
    return NextResponse.json({ error: 'Unknown folder' }, { status: 400 })
  }

  const items: ImageItem[] = []
  for (const prefix of prefixes) {
    let cursor: string | undefined
    do {
      const res = await list({
        prefix,
        cursor,
        limit: 1000,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      for (const b of res.blobs) {
        const folder = prefix.replace('/', '') as 'carousel-images' | 'hotspot-images'
        items.push({
          url: b.url,
          pathname: b.pathname,
          folder,
          size: b.size,
          uploadedAt: b.uploadedAt.toISOString(),
        })
      }
      cursor = res.cursor
    } while (cursor)
  }

  // Newest first
  items.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))

  return NextResponse.json(items)
}
