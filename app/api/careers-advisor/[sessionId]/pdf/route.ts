import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessCareersAdvisor } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { CareersAdvisorPDF } from '@/lib/careers-advisor-pdf'
import type { AdvisorReport } from '@/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!canAccessCareersAdvisor(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const advisorSession = await prisma.careerAdvisorSession.findUnique({
      where: { id: params.sessionId },
      include: { user: { select: { name: true } } },
    })

    if (!advisorSession || advisorSession.userId !== session!.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!advisorSession.report) {
      return NextResponse.json({ error: 'No report generated yet' }, { status: 400 })
    }

    const report = advisorSession.report as unknown as AdvisorReport
    const userName = advisorSession.user.name || undefined

    const buffer = await renderToBuffer(
      React.createElement(CareersAdvisorPDF, { report, userName }) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    )

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="careers-report.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
