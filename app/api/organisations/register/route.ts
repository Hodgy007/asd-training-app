import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { createRateLimiter, getClientIp } from '@/lib/rate-limit'

// 5 registration attempts per 15 minutes per IP
const registerOrgLimiter = createRateLimiter('register-org', 15 * 60 * 1000, 5)

const registerSchema = z.object({
  name: z.string().min(1, 'Organisation name is required').max(200),
  organisationType: z.enum(['SCHOOL', 'COLLEGE', 'ACADEMY', 'UNIVERSITY', 'EMPLOYER']),
  contactName: z.string().min(1, 'Contact name is required').max(200),
  contactEmail: z.string().email('Valid email is required').max(200),
  contactPhone: z.string().max(50).optional().default(''),
  addressLine1: z.string().max(200).optional().default(''),
  addressLine2: z.string().max(200).optional().default(''),
  city: z.string().max(100).optional().default(''),
  county: z.string().max(100).optional().default(''),
  postcode: z.string().max(20).optional().default(''),
  country: z.string().max(100).optional().default('United Kingdom'),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientIp(req)
  const rl = await registerOrgLimiter.check(ip)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, organisationType, contactName, contactEmail, contactPhone, addressLine1, addressLine2, city, county, postcode, country } = parsed.data

  // Generate a unique slug
  let slug = slugify(name)
  const existingSlug = await prisma.organisation.findUnique({ where: { slug } })
  if (existingSlug) {
    // Append a random suffix to avoid conflicts
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const org = await prisma.organisation.create({
    data: {
      name,
      slug,
      organisationType,
      contactName,
      contactEmail,
      contactPhone: contactPhone || undefined,
      addressLine1: addressLine1 || undefined,
      addressLine2: addressLine2 || undefined,
      city: city || undefined,
      county: county || undefined,
      postcode: postcode || undefined,
      country: country || 'United Kingdom',
      // Free self-registration — no admin approval gate. Orgs can be
      // re-deactivated by a super-admin if abuse is detected.
      pendingApproval: false,
      active: true,
      allowedRoles: [],
      allowedProgramIds: [],
    },
  })

  return NextResponse.json(
    { message: 'Registration submitted.', id: org.id },
    { status: 201 }
  )
}
