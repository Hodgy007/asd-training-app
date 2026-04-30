/**
 * Signs a client-direct upload URL for ZIP uploads to a library collection.
 *
 * Vercel serverless functions cap inbound bodies at 4.5 MB, so any ZIP larger
 * than that can't be sent as multipart/form-data to the extraction endpoint.
 * The browser instead PUTs the zip directly to Vercel Blob using a short-lived
 * token minted here, then POSTs the resulting Blob URL to the sibling
 * `zip-upload` route for extraction.
 *
 * Token issuance is gated by MANAGE_LIBRARY and restricted to the
 * `library/zip-uploads/` prefix so a leaked token can't write arbitrary blobs.
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

        if (!pathname.startsWith('library/zip-uploads/')) {
          throw new Error('Invalid upload path')
        }

        return {
          allowedContentTypes: [
            'application/zip',
            'application/x-zip-compressed',
            'application/octet-stream',
          ],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        }
      },
      onUploadCompleted: async () => {
        // No-op. The extraction endpoint handles processing once the browser
        // POSTs the resulting blob URL.
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
