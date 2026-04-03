import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
} from 'docx'
import type { CVDataForPDF } from '@/lib/cv-templates/shared'

const ALLOWED_ROLES = ['CAREER_DEV_OFFICER', 'STUDENT', 'INTERN', 'EMPLOYEE']

// Margin: 2.5cm in twips
const PAGE_MARGIN = convertMillimetersToTwip(25)

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28, // 14pt (half-points)
        font: 'Calibri',
      }),
    ],
    spacing: { before: 240, after: 120 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: '999999',
        space: 4,
      },
    },
  })
}

function formatDateRange(start: string, end: string | null, isCurrent?: boolean): string {
  if (isCurrent) return `${start} \u2013 Present`
  if (!end) return start
  return `${start} \u2013 ${end}`
}

function buildDocument(cv: CVDataForPDF): Document {
  const sections: Paragraph[] = []

  // Name
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: cv.fullName || 'Untitled CV',
          bold: true,
          size: 40, // 20pt
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
  )

  // Contact line
  const contactParts: string[] = []
  if (cv.email) contactParts.push(cv.email)
  if (cv.phone) contactParts.push(cv.phone)
  if (cv.city && cv.postcode) contactParts.push(`${cv.city}, ${cv.postcode}`)
  else if (cv.city) contactParts.push(cv.city)
  else if (cv.postcode) contactParts.push(cv.postcode)
  if (cv.linkedIn) contactParts.push(cv.linkedIn)

  if (contactParts.length > 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: contactParts.join('  |  '),
            size: 20, // 10pt
            font: 'Calibri',
            color: '555555',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
    )
  }

  // Personal Statement
  if (cv.personalStatement?.trim()) {
    sections.push(sectionHeading('Personal Statement'))
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cv.personalStatement,
            size: 22, // 11pt
            font: 'Calibri',
          }),
        ],
        spacing: { after: 120, line: 276 },
      }),
    )
  }

  // Work Experience
  if (cv.workExperiences.length > 0) {
    sections.push(sectionHeading('Work Experience'))
    for (const exp of cv.workExperiences) {
      // Job title + employer + dates
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: exp.jobTitle,
              bold: true,
              size: 22,
              font: 'Calibri',
            }),
            new TextRun({
              text: `  |  ${exp.employer}  |  ${formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}`,
              size: 22,
              font: 'Calibri',
              color: '555555',
            }),
          ],
          spacing: { before: 120, after: 40 },
        }),
      )
      // Description as bullet points
      if (exp.description?.trim()) {
        const lines = exp.description
          .split(/\n/)
          .map((l) => l.replace(/^[\u2022\u2023\u25E6\-*]\s*/, '').trim())
          .filter(Boolean)
        for (const line of lines) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  size: 22,
                  font: 'Calibri',
                }),
              ],
              bullet: { level: 0 },
              spacing: { after: 40, line: 276 },
            }),
          )
        }
      }
    }
  }

  // Education
  if (cv.educationEntries.length > 0) {
    sections.push(sectionHeading('Education'))
    for (const edu of cv.educationEntries) {
      const parts: TextRun[] = [
        new TextRun({
          text: edu.qualification,
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
        new TextRun({
          text: `  |  ${edu.institution}`,
          size: 22,
          font: 'Calibri',
          color: '555555',
        }),
      ]
      if (edu.grade) {
        parts.push(
          new TextRun({
            text: `  |  Grade: ${edu.grade}`,
            size: 22,
            font: 'Calibri',
            color: '555555',
          }),
        )
      }
      parts.push(
        new TextRun({
          text: `  |  ${formatDateRange(edu.startDate, edu.endDate)}`,
          size: 22,
          font: 'Calibri',
          color: '555555',
        }),
      )
      sections.push(
        new Paragraph({
          children: parts,
          spacing: { before: 120, after: 40 },
        }),
      )
      if (edu.description?.trim()) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.description,
                size: 22,
                font: 'Calibri',
              }),
            ],
            spacing: { after: 80, line: 276 },
          }),
        )
      }
    }
  }

  // Skills
  if (cv.skills.length > 0) {
    sections.push(sectionHeading('Skills'))

    // Group by category
    const grouped = new Map<string, string[]>()
    for (const skill of cv.skills) {
      const cat = skill.category || 'General'
      if (!grouped.has(cat)) grouped.set(cat, [])
      grouped.get(cat)!.push(skill.name)
    }

    if (grouped.size === 1 && grouped.has('General')) {
      // No categories, list as comma-separated
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cv.skills.map((s) => s.name).join(', '),
              size: 22,
              font: 'Calibri',
            }),
          ],
          spacing: { after: 80 },
        }),
      )
    } else {
      for (const [category, names] of grouped) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${category}: `,
                bold: true,
                size: 22,
                font: 'Calibri',
              }),
              new TextRun({
                text: names.join(', '),
                size: 22,
                font: 'Calibri',
              }),
            ],
            spacing: { after: 40 },
          }),
        )
      }
    }
  }

  // Interests
  if (cv.interests?.trim()) {
    sections.push(sectionHeading('Interests'))
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cv.interests,
            size: 22,
            font: 'Calibri',
          }),
        ],
        spacing: { after: 120, line: 276 },
      }),
    )
  }

  // References
  if (cv.references.length > 0 || cv.refsAvailableOnRequest) {
    sections.push(sectionHeading('References'))
    if (cv.refsAvailableOnRequest && cv.references.length === 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'References available on request',
              italics: true,
              size: 22,
              font: 'Calibri',
              color: '555555',
            }),
          ],
          spacing: { after: 80 },
        }),
      )
    } else {
      for (const ref of cv.references) {
        const refParts: TextRun[] = [
          new TextRun({
            text: ref.name,
            bold: true,
            size: 22,
            font: 'Calibri',
          }),
        ]
        if (ref.jobTitle) {
          refParts.push(
            new TextRun({
              text: ` - ${ref.jobTitle}`,
              size: 22,
              font: 'Calibri',
            }),
          )
        }
        if (ref.organisation) {
          refParts.push(
            new TextRun({
              text: `, ${ref.organisation}`,
              size: 22,
              font: 'Calibri',
            }),
          )
        }
        sections.push(
          new Paragraph({
            children: refParts,
            spacing: { before: 80, after: 20 },
          }),
        )
        const contactRuns: string[] = []
        if (ref.email) contactRuns.push(ref.email)
        if (ref.phone) contactRuns.push(ref.phone)
        if (contactRuns.length > 0) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: contactRuns.join('  |  '),
                  size: 20,
                  font: 'Calibri',
                  color: '555555',
                }),
              ],
              spacing: { after: 60 },
            }),
          )
        }
      }
      if (cv.refsAvailableOnRequest) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Additional references available on request',
                italics: true,
                size: 22,
                font: 'Calibri',
                color: '555555',
              }),
            ],
            spacing: { before: 80, after: 80 },
          }),
        )
      }
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in twips
            margin: {
              top: PAGE_MARGIN,
              right: PAGE_MARGIN,
              bottom: PAGE_MARGIN,
              left: PAGE_MARGIN,
            },
          },
        },
        children: sections,
      },
    ],
  })
}

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

    const doc = buildDocument(cvData)
    const buffer = await Packer.toBuffer(doc)

    const safeName = (cv.title || 'cv')
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 80) || 'cv'

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}.docx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('GET /api/cv-builder/[cvId]/docx error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
