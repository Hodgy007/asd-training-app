import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { prisma } from './prisma'

export const TOOLKIT_SESSION_COOKIE = 'toolkit-session'
const SESSION_TTL_DAYS = 90
const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60

function b64urlEncode(bytes: Buffer | string): string {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes, 'utf8')
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function b64urlDecode(input: string): Buffer | null {
  try {
    const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
    const normalised = input.replace(/-/g, '+').replace(/_/g, '/') + pad
    return Buffer.from(normalised, 'base64')
  } catch {
    return null
  }
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('NEXTAUTH_SECRET is not configured')
  }
  return secret
}

type Payload = {
  sub: string
  iat: number
  exp: number
}

export function signToolkitSession(registrantId: string, now = Math.floor(Date.now() / 1000)): string {
  const payload: Payload = {
    sub: registrantId,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  }
  const body = b64urlEncode(JSON.stringify(payload))
  const sig = b64urlEncode(createHmac('sha256', getSecret()).update(body).digest())
  return `${body}.${sig}`
}

export function verifyToolkitSession(token: string | undefined | null, now = Math.floor(Date.now() / 1000)): { registrantId: string } | null {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot < 1 || dot === token.length - 1) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expected = createHmac('sha256', getSecret()).update(body).digest()
  const provided = b64urlDecode(sig)
  if (!provided || provided.length !== expected.length) return null
  if (!timingSafeEqual(provided, expected)) return null

  const decoded = b64urlDecode(body)
  if (!decoded) return null
  let payload: Payload
  try {
    payload = JSON.parse(decoded.toString('utf8')) as Payload
  } catch {
    return null
  }
  if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null
  if (payload.exp < now) return null
  return { registrantId: payload.sub }
}

export type ToolkitSessionRegistrant = {
  id: string
  name: string
  email: string
  formRole: string
  hasAccount: boolean
  organisation: string | null
  postcode: string | null
}

export async function getToolkitRegistrant(): Promise<ToolkitSessionRegistrant | null> {
  const token = cookies().get(TOOLKIT_SESSION_COOKIE)?.value
  const verified = verifyToolkitSession(token)
  if (!verified) return null

  const row = await prisma.toolkitRegistrant.findUnique({
    where: { id: verified.registrantId },
    select: {
      id: true,
      name: true,
      email: true,
      formRole: true,
      organisation: true,
      postcode: true,
      userId: true,
    },
  })
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    formRole: row.formRole,
    organisation: row.organisation,
    postcode: row.postcode,
    hasAccount: row.userId !== null,
  }
}

export function buildToolkitSessionCookie(registrantId: string): string {
  const token = signToolkitSession(registrantId)
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${TOOLKIT_SESSION_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (isProd) parts.push('Secure')
  return parts.join('; ')
}

export function buildToolkitClearCookie(): string {
  const isProd = process.env.NODE_ENV === 'production'
  const parts = [
    `${TOOLKIT_SESSION_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (isProd) parts.push('Secure')
  return parts.join('; ')
}
