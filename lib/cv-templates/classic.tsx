import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { colours, formatDateRange, BulletList } from './shared'
import type { CVDataForPDF } from './shared'

/*
 * CLASSIC template
 * - Traditional single-column UK CV
 * - Name centred at top, larger font
 * - Contact details centred below name
 * - Horizontal rules between sections
 * - Section headings left-aligned, bold, uppercase
 * - 11pt body text
 * - Conservative, suitable for formal employers
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 45,
    paddingBottom: 45,
    paddingHorizontal: 55,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: colours.text,
    lineHeight: 1.4,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: colours.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  contact: {
    fontSize: 10,
    color: colours.muted,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 1.5,
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    marginBottom: 10,
    marginTop: 2,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: colours.text,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  entryTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colours.text,
  },
  entryDates: {
    fontSize: 10,
    color: colours.muted,
  },
  entrySubtitle: {
    fontSize: 10,
    color: colours.muted,
    marginBottom: 3,
  },
  body: {
    fontSize: 11,
    color: colours.text,
    lineHeight: 1.4,
  },
  skillsText: {
    fontSize: 11,
    color: colours.text,
    lineHeight: 1.5,
  },
  refBlock: {
    marginBottom: 8,
  },
})

function contactLine(cv: CVDataForPDF): string {
  const parts: string[] = []
  if (cv.email) parts.push(cv.email)
  if (cv.phone) parts.push(cv.phone)
  if (cv.city && cv.postcode) parts.push(`${cv.city}, ${cv.postcode}`)
  else if (cv.city) parts.push(cv.city)
  else if (cv.postcode) parts.push(cv.postcode)
  if (cv.linkedIn) parts.push(cv.linkedIn)
  return parts.join('   \u00B7   ')
}

export function ClassicTemplate({ cv }: { cv: CVDataForPDF }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Name */}
        <Text style={styles.name}>{cv.fullName || 'Your Name'}</Text>

        {/* Contact */}
        <Text style={styles.contact}>{contactLine(cv)}</Text>

        <View style={styles.hr} />

        {/* Personal Statement */}
        {cv.personalStatement && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Personal Statement</Text>
            <Text style={styles.body}>{cv.personalStatement}</Text>
            <View style={styles.hr} />
          </View>
        )}

        {/* Work Experience */}
        {cv.workExperiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Work Experience</Text>
            {cv.workExperiences.map((exp) => (
              <View key={exp.id} style={{ marginBottom: 10 }}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>{exp.jobTitle}</Text>
                  <Text style={styles.entryDates}>
                    {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                  </Text>
                </View>
                <Text style={styles.entrySubtitle}>{exp.employer}</Text>
                {exp.description && <BulletList text={exp.description} />}
              </View>
            ))}
            <View style={styles.hr} />
          </View>
        )}

        {/* Education */}
        {cv.educationEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Education</Text>
            {cv.educationEntries.map((edu) => (
              <View key={edu.id} style={{ marginBottom: 10 }}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTitle}>{edu.qualification}</Text>
                  <Text style={styles.entryDates}>
                    {formatDateRange(edu.startDate, edu.endDate)}
                  </Text>
                </View>
                <Text style={styles.entrySubtitle}>
                  {edu.institution}
                  {edu.grade ? ` \u2014 ${edu.grade}` : ''}
                </Text>
                {edu.description && <BulletList text={edu.description} />}
              </View>
            ))}
            <View style={styles.hr} />
          </View>
        )}

        {/* Skills */}
        {cv.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Skills</Text>
            <Text style={styles.skillsText}>
              {cv.skills.map((s) => s.name).join('  \u00B7  ')}
            </Text>
            <View style={styles.hr} />
          </View>
        )}

        {/* Interests */}
        {cv.interests && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Interests</Text>
            <Text style={styles.body}>{cv.interests}</Text>
            <View style={styles.hr} />
          </View>
        )}

        {/* References */}
        {(cv.references.length > 0 || cv.refsAvailableOnRequest) && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>References</Text>
            {cv.refsAvailableOnRequest && cv.references.length === 0 ? (
              <Text style={styles.body}>Available on request.</Text>
            ) : (
              <>
                {cv.references.map((ref) => (
                  <View key={ref.id} style={styles.refBlock}>
                    <Text style={styles.entryTitle}>{ref.name}</Text>
                    {ref.jobTitle && (
                      <Text style={styles.entrySubtitle}>
                        {ref.jobTitle}
                        {ref.organisation ? `, ${ref.organisation}` : ''}
                      </Text>
                    )}
                    {ref.email && (
                      <Text style={{ fontSize: 10, color: colours.muted }}>{ref.email}</Text>
                    )}
                    {ref.phone && (
                      <Text style={{ fontSize: 10, color: colours.muted }}>{ref.phone}</Text>
                    )}
                  </View>
                ))}
                {cv.refsAvailableOnRequest && (
                  <Text style={[styles.body, { fontStyle: 'italic', fontSize: 10, marginTop: 4 }]}>
                    Additional references available on request.
                  </Text>
                )}
              </>
            )}
          </View>
        )}
      </Page>
    </Document>
  )
}
