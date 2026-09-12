import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => {
  const prisma = {
    samlAuthnRequest: {
      create: vi.fn(async () => ({})),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  }
  return { prisma, default: prisma }
})

import { generateSamlLoginUrl, PUBLIC_MAILBOX_DOMAINS, EMAIL_DOMAIN_RE } from '../saml'

describe('generateSamlLoginUrl — https enforcement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a non-https SSO URL (javascript: / http:)', async () => {
    await expect(generateSamlLoginUrl('javascript:alert(1)', 'a@school.ac.uk')).rejects.toThrow()
    await expect(generateSamlLoginUrl('http://idp.example.com/sso', 'a@school.ac.uk')).rejects.toThrow()
  })

  it('accepts an https SSO URL and returns a redirect containing SAMLRequest', async () => {
    const url = await generateSamlLoginUrl('https://idp.example.com/sso', 'a@school.ac.uk')
    expect(url.startsWith('https://idp.example.com/sso?')).toBe(true)
    expect(url).toContain('SAMLRequest=')
  })
})

describe('SSO domain guard rails', () => {
  it('flags common consumer mailboxes as public', () => {
    for (const d of ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.co.uk', 'icloud.com']) {
      expect(PUBLIC_MAILBOX_DOMAINS.has(d)).toBe(true)
    }
    expect(PUBLIC_MAILBOX_DOMAINS.has('school.ac.uk')).toBe(false)
  })

  it('EMAIL_DOMAIN_RE accepts real domains and rejects junk', () => {
    expect(EMAIL_DOMAIN_RE.test('school.ac.uk')).toBe(true)
    expect(EMAIL_DOMAIN_RE.test('sub.example.com')).toBe(true)
    expect(EMAIL_DOMAIN_RE.test('nodot')).toBe(false)
    expect(EMAIL_DOMAIN_RE.test('-bad.com')).toBe(false)
    expect(EMAIL_DOMAIN_RE.test('bad-.com')).toBe(false)
    expect(EMAIL_DOMAIN_RE.test('a@b.com')).toBe(false)
  })
})
