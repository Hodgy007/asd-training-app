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

        const isBrandAssetZip = pathname.startsWith('brand-assets-zips/')
        if (
          !pathname.startsWith('library/documents/') &&
          !pathname.startsWith('library/thumbnails/') &&
          !pathname.startsWith('brand-assets/') &&
          !isBrandAssetZip
        ) {
          throw new Error('Invalid upload path')
        }

        return {
          addRandomSuffix: true,
          // Bulk-import zips for the brand store are extracted server-side
          // and then deleted, so restrict the token to zip MIME types.
          ...(isBrandAssetZip
            ? {
                allowedContentTypes: [
                  'application/zip',
                  'application/x-zip-compressed',
                  'application/octet-stream',
                ],
              }
            : {}),
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        }
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
