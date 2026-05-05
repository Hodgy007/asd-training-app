import { NextResponse } from 'next/server'
import { buildToolkitClearCookie } from '@/lib/toolkit-session'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.headers.append('Set-Cookie', buildToolkitClearCookie())
  return res
}
