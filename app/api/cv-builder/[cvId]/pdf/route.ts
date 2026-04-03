import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

import { AccessibleTemplate } from '@/lib/cv-templates/accessible'
import { ModernTemplate } from '@/lib/cv-templates/modern'
import { ClassicTemplate } from '@/lib/cv-templates/classic'
import type { CVDataForPDF } from '@/lib/cv-templates/shared'

const ALLOWED_ROLES = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE']

export async function GET(
  _req: NextRequest,
  { params }: { params: { cvId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = session.user.role
  if (!ALLOWED_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch the CV with all relations
    const cv = await prisma.cV.findUnique({
      where: { id: params.cvId },
      include: {
        workExperiences: { orderBy: { order: 'asc' } },
        educationEntries: { orderBy: { order: 'asc' } },
        skills: { orderBy: { order: 'asc' } },
        references: { orderBy: { order: 'asc' } },
        user: { select: { id: true, organisationId: true } },
      },
    })

    if (!cv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Access check: owner OR CDO in the same org
    const isOwner = cv.userId === session.user.id

    let isCdoSameOrg = false
    if (!isOwner && userRole === 'CAREER_DEV_OFFICER') {
      const cdo = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { organisationId: true },
      })
      if (
        cdo?.organisationId &&
        cv.user.organisationId &&
        cdo.organisationId === cv.user.organisationId
      ) {
        isCdoSameOrg = true
      }
    }

    if (!isOwner && !isCdoSameOrg) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prepare data for templates (strip the user relation)
    const cvData: CVDataForPDF = {
      id: cv.id,
      title: cv.title,
      template: cv.template,
      fullName: cv.fullName,
      email: cv.email,
      phone: cv.phone,
      city: cv.city,
      postcode: cv.postcode,
      linkedIn: cv.linkedIn,
      personalStatement: cv.personalStatement,
      interests: cv.interests,
      refsAvailableOnRequest: cv.refsAvailableOnRequest,
      workExperiences: cv.workExperiences,
      educationEntries: cv.educationEntries,
      skills: cv.skills,
      references: cv.references,
    }

    // Select template
    let templateElement: React.ReactElement
    switch (cv.template) {
      case 'MODERN':
        templateElement = React.createElement(ModernTemplate, { cv: cvData })
        break
      case 'CLASSIC':
        templateElement = React.createElement(ClassicTemplate, { cv: cvData })
        break
      case 'ACCESSIBLE':
      default:
        templateElement = React.createElement(AccessibleTemplate, { cv: cvData })
        break
    }

    // Render to PDF buffer
    const buffer = await renderToBuffer(templateElement)

    // Sanitise the filename
    const safeName = (cv.title || 'cv')
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 80) || 'cv'

    return new Response(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('GET /api/cv-builder/[cvId]/pdf error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
