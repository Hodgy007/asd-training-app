import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { parseMetadataUrl } from '@/lib/saml'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { metadataUrl } = body

  if (!metadataUrl || typeof metadataUrl !== 'string') {
    return NextResponse.json({ error: 'metadataUrl is required' }, { status: 400 })
  }

  const result = await parseMetadataUrl(metadataUrl)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    entityId: result.entityId,
    ssoUrl: result.ssoUrl,
    certificate: result.certificate,
  })
}
