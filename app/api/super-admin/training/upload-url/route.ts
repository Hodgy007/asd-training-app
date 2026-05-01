/**
 * Mints a short-lived Vercel Blob client-upload token for training videos.
 *
 * Server-side multipart uploads are capped by the Vercel function body limit,
 * making large videos (>~500 MB) impossible to send via a regular POST.
 * Client-direct upload bypasses that limit entirely — the browser PUTs the
 * file straight to Vercel Blob using the signed token returned here.
 *
 * Token is restricted to the `training-videos/` prefix and to MP4/WebM MIME
 * types so a leaked token can't write arbitrary content.
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

        if (!pathname.startsWith('training-videos/')) {
          throw new Error('Invalid upload path')
        }

        return {
          allowedContentTypes: ['video/mp4', 'video/webm'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        }
      },
      onUploadCompleted: async () => {
        // No-op — the lesson editor sets the returned URL on the lesson record.
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
