import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { entityId, ssoUrl, certificate } = body

  if (!entityId || !ssoUrl || !certificate) {
    return NextResponse.json({ error: 'entityId, ssoUrl, and certificate are required' }, { status: 400 })
  }

  // Validate certificate format
  try {
    const certClean = certificate.trim()
    const base64Regex = /^[A-Za-z0-9+/\r\n=\s-]+$/
    const rawCert = certClean
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .trim()
    if (!base64Regex.test(rawCert)) {
      return NextResponse.json({ success: false, error: 'Certificate is not valid base64' })
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid certificate format' })
  }

  // Validate SSO URL is reachable
  try {
    const urlObj = new URL(ssoUrl)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return NextResponse.json({ success: false, error: 'SSO URL must use http or https' })
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid SSO URL format' })
  }

  return NextResponse.json({ success: true })
}
