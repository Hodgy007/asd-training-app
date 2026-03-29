import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isOrgAdmin } from '@/lib/rbac'
import { testMeetingConnection } from '@/lib/meetings'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isOrgAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { platform, apiKey, apiSecret, tenantId } = body

  if (!platform || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'platform, apiKey, and apiSecret are required' },
      { status: 400 }
    )
  }

  const result = await testMeetingConnection(platform, apiKey, apiSecret, tenantId)

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
