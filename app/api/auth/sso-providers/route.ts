import { NextResponse } from 'next/server'

export async function GET() {
  // Mirrors the ENABLE_OAUTH_SSO gate in lib/auth.ts. When the flag is off the
  // providers aren't registered, so the login page must hide the buttons too.
  const oauthEnabled = process.env.ENABLE_OAUTH_SSO === 'true'
  return NextResponse.json({
    google: oauthEnabled && !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    microsoft: oauthEnabled && !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET),
  })
}
