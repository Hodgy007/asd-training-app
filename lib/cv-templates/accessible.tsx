import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { colours, formatDateRange, contactLine, BulletList } from './shared'
import type { CVDataForPDF } from './shared'

/*
 * ACCESSIBLE template (default, recommended for autistic users)
 * - Single column layout
 * - 12pt body text, 16pt section headings
 * - 1.5 line spacing
 * - High contrast: black on white
 * - Extra whitespace between sections
 * - Clear section dividers
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 55,
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#000000',
    lineHeight: 1.5,
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginBottom: 4,
  },
  contact: {
    fontSize: 11,
    color: '#333333',
    marginBottom: 24,
    lineHeight: 1.4,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  entryTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  entrySubtitle: {
    fontSize: 11,
    color: '#333333',
    marginBottom: 2,
  },
  entryDates: {
    fontSize: 10,
    color: '#555555',
    marginBottom: 4,
  },
  body: {
    fontSize: 12,
    color: '#000000',
    lineHeight: 1.5,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  skillBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    color: '#000000',
  },
  refBlock: {
    marginBottom: 8,
  },
})

export function AccessibleTemplate({ cv }: { cv: CVDataForPDF }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Name */}
        <Text style={styles.name}>{cv.fullName || 'Your Name'}</Text>

        {/* Contact row */}
        <Text style={styles.contact}>{contactLine(cv)}</Text>

        {/* Personal Statement */}
        {cv.personalStatement && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Personal Statement</Text>
            <Text style={styles.body}>{cv.personalStatement}</Text>
          </View>
        )}

        {/* Work Experience */}
        {cv.workExperiences.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Work Experience</Text>
            {cv.workExperiences.map((exp) => (
              <View key={exp.id} style={{ marginBottom: 12 }}>
                <Text style={styles.entryTitle}>{exp.jobTitle}</Text>
                <Text style={styles.entrySubtitle}>{exp.employer}</Text>
                <Text style={styles.entryDates}>
                  {formatDateRange(exp.startDate, exp.endDate, exp.isCurrent)}
                </Text>
                {exp.description && <BulletList text={exp.description} fontSize={12} />}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {cv.educationEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Education</Text>
            {cv.educationEntries.map((edu) => (
              <View key={edu.id} style={{ marginBottom: 12 }}>
                <Text style={styles.entryTitle}>{edu.qualification}</Text>
                <Text style={styles.entrySubtitle}>
                  {edu.institution}
                  {edu.grade ? ` \u2014 ${edu.grade}` : ''}
                </Text>
                <Text style={styles.entryDates}>
                  {formatDateRange(edu.startDate, edu.endDate)}
                </Text>
                {edu.description && <BulletList text={edu.description} fontSize={12} />}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {cv.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Skills</Text>
            <View style={styles.skillsRow}>
              {cv.skills.map((skill) => (
                <Text key={skill.id} style={styles.skillBadge}>
                  {skill.name}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Interests */}
        {cv.interests && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Interests</Text>
            <Text style={styles.body}>{cv.interests}</Text>
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
                    {ref.email && <Text style={styles.entryDates}>{ref.email}</Text>}
                    {ref.phone && <Text style={styles.entryDates}>{ref.phone}</Text>}
                  </View>
                ))}
                {cv.refsAvailableOnRequest && (
                  <Text style={[styles.body, { marginTop: 4, fontStyle: 'italic' }]}>
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
