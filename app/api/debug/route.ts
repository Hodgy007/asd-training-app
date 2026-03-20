export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { authOptions } = await import('@/lib/auth')
    const NextAuth = (await import('next-auth')).default
    return Response.json({ ok: true, providers: Object.keys(authOptions.providers || {}) })
  } catch (e: unknown) {
    const err = e as Error
    return Response.json({ error: err?.message, stack: err?.stack }, { status: 500 })
  }
}
