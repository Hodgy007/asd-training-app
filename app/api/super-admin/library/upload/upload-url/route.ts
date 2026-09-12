/**
 * Signs a client-direct upload URL for single library document uploads.
 *
 * Vercel serverless functions cap inbound bodies at 4.5 MB, so files over that
 * size can't be uploaded via multipart/form-data. The browser instead PUTs the
 * file directly to Vercel Blob using a token minted here, then POSTs JSON
 * metadata (the resulting Blob URL plus title/description) to the document
 * creation endpoint.
 *
 * Token issuance is gated by MANAGE_LIBRARY and restricted to the
 * `library/documents/` prefix so a leaked token can't write arbitrary blobs.
 */
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasPermission, CHARITY_PERMISSIONS } from '@/lib/rbac'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getServerSession(authOptions)
        if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_LIBRARY)) {
          throw new Error('Forbidden')
        }

        // Every prefix pins BOTH the allowed content types and a maximum
        // size. Without an allow-list a leaked (or self-minted) token could
        // PUT text/html or image/svg+xml to a library path, which the
        // document proxy would then serve inline on the app origin — a
        // same-origin XSS. Text/HTML and SVG are deliberately absent from
        // every list below.
        const DOC_TYPES = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'text/csv',
          'image/png',
          'image/jpeg',
          'image/gif',
          'video/mp4',
          'video/webm',
          'application/octet-stream',
        ]
        const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
        const ZIP_TYPES = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
        const MB = 1024 * 1024

        if (pathname.startsWith('library/documents/')) {
          return {
            addRandomSuffix: true,
            allowedContentTypes: DOC_TYPES,
            maximumSizeInBytes: 50 * MB,
            tokenPayload: JSON.stringify({ userId: session.user.id }),
          }
        }
        if (pathname.startsWith('library/thumbnails/') || pathname.startsWith('brand-assets/')) {
          return {
            addRandomSuffix: true,
            allowedContentTypes: IMAGE_TYPES,
            maximumSizeInBytes: 10 * MB,
            tokenPayload: JSON.stringify({ userId: session.user.id }),
          }
        }
        if (pathname.startsWith('brand-assets-zips/')) {
          // Bulk-import zips for the brand store are extracted server-side
          // and then deleted, so restrict the token to zip MIME types.
          return {
            addRandomSuffix: true,
            allowedContentTypes: ZIP_TYPES,
            maximumSizeInBytes: 100 * MB,
            tokenPayload: JSON.stringify({ userId: session.user.id }),
          }
        }
        throw new Error('Invalid upload path')
      },
      onUploadCompleted: async () => {
        // No-op. The caller POSTs the resulting blob URL to the document
        // creation endpoint to record the LibraryDocument row.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload URL request failed' },
      { status: 400 },
    )
  }
}
