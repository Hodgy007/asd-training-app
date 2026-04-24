/**
 * Signs a client-direct upload URL for SCORM imports.
 *
 * Vercel Serverless Functions have a hard 4.5 MB request-body limit at the
 * platform edge, which blocks large SCORM packages (commonly 20–100 MB) from
 * ever reaching the `scorm-import` endpoint. Instead the browser uploads the
 * zip straight to Vercel Blob using a short-lived token minted here, and then
 * POSTs just the resulting Blob URL to `scorm-import` for extraction.
 *
 * We gate token generation behind the MANAGE_TRAINING permission and restrict
 * the upload to zip content types under the `scorm-imports/` prefix so a
 * compromised token can't be used to write arbitrary blobs.
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
        if (!session || !hasPermission(session, CHARITY_PERMISSIONS.MANAGE_TRAINING)) {
          throw new Error('Forbidden')
        }

        if (!pathname.startsWith('scorm-imports/')) {
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
        // No-op. The main scorm-import endpoint handles extraction once the
        // browser POSTs the resulting blob URL.
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
