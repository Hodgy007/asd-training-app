import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getToolkitRegistrant } from '@/lib/toolkit-session'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    return NextResponse.json({
      authenticated: true,
      registrant: null,
      session: { name: session.user.name ?? null, email: session.user.email ?? null },
    })
  }
  const registrant = await getToolkitRegistrant()
  if (!registrant) {
    return NextResponse.json({ authenticated: false, registrant: null })
  }
  return NextResponse.json({
    authenticated: false,
    registrant: {
      name: registrant.name,
      email: registrant.email,
      formRole: registrant.formRole,
      organisation: registrant.organisation,
      postcode: registrant.postcode,
      hasAccount: registrant.hasAccount,
    },
  })
}
